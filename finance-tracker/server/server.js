require('dotenv').config();
const express = require('express');
const path = require('path');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const { parseImportFile } = require('./import');
const { generateExportBuffer } = require('./export');
const db = require('./db');
const backupService = require('./backupService');
const cloudStorage = require('./cloudStorage');
const { startBackupScheduler } = require('./backupScheduler');

const app = express();

// HA ingress forwards requests with the ingress token stripped, but the React
// app adds a '/app' basename for client-side routing. Strip it from API calls
// so Express routes like /app-api/... match correctly.
app.use((req, res, next) => {
  if (req.path.startsWith('/app/')) {
    req.url = req.url.slice(4); // strip leading /app
  }
  next();
});

app.use(express.json());

// Taxonomy routes
app.get('/app-api/taxonomy', (req, res) => {
  res.json(db.getTaxonomy());
});

app.post('/app-api/taxonomy', (req, res) => {
  const { type, category, subcategory } = req.body;
  if (!type || !category || !subcategory) return res.status(400).json({ error: 'type, category, subcategory required' });
  const result = db.createTaxonomy({ type, category, subcategory });
  res.status(201).json(result);
});

app.put('/app-api/taxonomy/:id', (req, res) => {
  const result = db.updateTaxonomy(Number(req.params.id), req.body);
  if (!result) return res.status(404).json({ error: 'Taxonomy entry not found' });
  res.json(result);
});

app.delete('/app-api/taxonomy/:id', (req, res) => {
  const result = db.deleteTaxonomy(Number(req.params.id));
  if (result.status === 404) return res.status(404).json({ error: result.error });
  if (result.status === 400) return res.status(400).json({ error: result.error });
  res.json(result);
});

app.patch('/app-api/taxonomy/reorder', (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Array of {id, sort_order} required' });
  res.json(db.reorderTaxonomy(req.body));
});

// Transactions routes
app.get('/app-api/transactions', (req, res) => {
  const { month, fy_start } = req.query;
  if (fy_start) {
    // Fetch all transactions for a financial year
    res.json(db.getTransactionsByFy(fy_start));
  } else if (month) {
    // Fetch transactions for a specific month
    res.json(db.getTransactions(month));
  } else {
    // Fetch all transactions
    res.json(db.getTransactions());
  }
});

app.post('/app-api/transactions', (req, res) => {
  const { date, type, category, subcategory, amount } = req.body;
  if (!date || !type || !category || !subcategory || amount == null) {
    return res.status(400).json({ error: 'date, type, category, subcategory, amount required' });
  }
  if (amount <= 0) return res.status(400).json({ error: 'amount must be positive' });
  const result = db.createTransaction(req.body);
  res.status(201).json(result);
});

app.put('/app-api/transactions/:id', (req, res) => {
  const result = db.updateTransaction(Number(req.params.id), req.body);
  if (!result) return res.status(404).json({ error: 'Transaction not found' });
  res.json(result);
});

app.delete('/app-api/transactions/:id', (req, res) => {
  const result = db.deleteTransaction(Number(req.params.id));
  if (!result) return res.status(404).json({ error: 'Transaction not found' });
  res.json(result);
});

// Budgets routes
app.get('/app-api/budgets', (req, res) => {
  const { fy_start } = req.query;
  if (!fy_start) return res.status(400).json({ error: 'fy_start required' });
  res.json(db.getBudgets(fy_start));
});

app.post('/app-api/budgets/bulk', (req, res) => {
  const { fy_start, rows } = req.body;
  if (!fy_start || !Array.isArray(rows)) return res.status(400).json({ error: 'fy_start and rows[] required' });
  res.json(db.upsertBudgets(fy_start, rows));
});

// Dashboard routes
app.get('/app-api/dashboard/monthly', (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: 'month required' });
  res.json(db.getDashboardMonthly(month));
});

app.get('/app-api/dashboard/yearly', (req, res) => {
  const { fy_start } = req.query;
  if (!fy_start) return res.status(400).json({ error: 'fy_start required' });
  res.json(db.getDashboardYearly(fy_start));
});

app.get('/app-api/dashboard/category-trend', (req, res) => {
  const { fy_start } = req.query;
  if (!fy_start) return res.status(400).json({ error: 'fy_start required' });
  res.json(db.getDashboardCategoryTrend(fy_start));
});

app.post('/app-api/reset', (req, res) => {
  try {
    const { fy_start, full } = req.body;
    
    // If full reset is requested or no parameters provided, do full database reset
    if (full || (!fy_start && !full)) {
      res.json(db.resetDatabase());
    } else {
      // Reset only the specified FY
      res.json(db.resetFy(fy_start));
    }
  }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Import route
app.post('/app-api/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { transactions, budgets, errors } = parseImportFile(req.file.buffer);

  // Insert transactions
  const txResult = db.bulkInsertTransactions(transactions);

  // Upsert budgets
  const bgResult = db.bulkUpsertBudgets(budgets);

  res.json({
    transactions: { inserted: txResult.inserted, skipped: transactions.length - txResult.inserted },
    budgets:      { upserted: bgResult.upserted },
    errors        // array of { row, reason } objects
  });
});

// OAuth 2.0 Setup Routes
app.get('/app-api/auth/google/setup', (req, res) => {
  if (cloudStorage.credentialsExist()) {
    return res.json({ message: 'OAuth credentials already configured', setupUrl: null });
  }

  const setupUrl = cloudStorage.generateSetupUrl(req);
  res.json({
    message: 'Click the URL below to authorize Finance Tracker with your Google account',
    setupUrl,
    instructions: 'You will be redirected after authorization. Refresh the app and backups will be enabled.'
  });
});

app.get('/app-api/auth/google/callback', async (req, res) => {
  try {
    const { code, error } = req.query;

    if (error) {
      return res.status(400).json({ error: `Authorization failed: ${error}` });
    }

    if (!code) {
      return res.status(400).json({ error: 'No authorization code received' });
    }

    await cloudStorage.exchangeAuthorizationCode(code, req);

    // Return success HTML that redirects user back to app
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Finance Tracker - OAuth Setup</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f5f5f5; }
            .container { max-width: 400px; margin: 100px auto; padding: 20px; background: white; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .success { color: #1A6B3A; font-size: 48px; margin-bottom: 10px; }
            h1 { color: #1B3A6B; margin: 0 0 10px 0; }
            p { color: #666; margin: 10px 0; }
            .button { background: #1B3A6B; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none; display: inline-block; margin-top: 20px; }
            .button:hover { background: #2E75B6; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">✓</div>
            <h1>Authorization Successful!</h1>
            <p>OAuth setup is complete. Google Drive backups are now enabled.</p>
            <p>Go back to the Finance Tracker app and confirm backups are working in Settings → Backup & Restore.</p>
            <a href="/" class="button">Return to App</a>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth callback error:', error.message);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #f5f5f5; }
            .container { max-width: 400px; margin: 100px auto; padding: 20px; background: white; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .error { color: #B03030; font-size: 48px; margin-bottom: 10px; }
            h1 { color: #1B3A6B; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error">✗</div>
            <h1>Authorization Failed</h1>
            <p>${error.message}</p>
            <p><a href="/">Return to App</a></p>
          </div>
        </body>
      </html>
    `);
  }
});

// Backup and Recovery routes
app.get('/app-api/backup/status', async (req, res) => {
  try {
    if (!cloudStorage.isCredentialsReady()) {
      return res.json({
        success: false,
        credentialsReady: false,
        message: 'OAuth credentials not configured. Please complete setup first.',
        setupUrl: '/app-api/auth/google/setup'
      });
    }

    const status = await backupService.getBackupStatus();
    res.json({ ...status, credentialsReady: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/app-api/backup/create', async (req, res) => {
  try {
    if (!cloudStorage.isCredentialsReady()) {
      return res.status(400).json({
        error: 'OAuth credentials not configured. Please complete setup first.',
        setupUrl: '/app-api/auth/google/setup'
      });
    }

    const result = await backupService.createBackup();
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/app-api/backup/restore', async (req, res) => {
  try {
    if (!cloudStorage.isCredentialsReady()) {
      return res.status(400).json({
        error: 'OAuth credentials not configured. Please complete setup first.',
        setupUrl: '/app-api/auth/google/setup'
      });
    }

    const result = await backupService.restoreBackup();
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export route
app.get('/app-api/export', (req, res) => {
  const { fy_start, month } = req.query;
  
  if (!fy_start) {
    return res.status(400).json({ error: 'fy_start parameter is required' });
  }
  
  try {
    const buffer = generateExportBuffer(fy_start, month || null);
    
    const filename = month 
      ? `finance-export-${month}.xlsx` 
      : `finance-export-${fy_start}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve client in production
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);

  // Initialize OAuth for backups
  if (process.env.BACKUP_ENABLED === 'true') {
    try {
      cloudStorage.initializeAuth();
      
      if (cloudStorage.isCredentialsReady()) {
        // Backups are configured, start scheduler
        const schedule = process.env.BACKUP_SCHEDULE || '0 0 * * 0'; // Default: Sunday midnight
        startBackupScheduler(schedule);
        console.log('✅ Backup scheduler active');
      } else {
        // Credentials missing - backups disabled but app running
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📋 BACKUPS NOT CONFIGURED');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('To enable Google Drive backups:');
        console.log(`  1. Visit: http://localhost:${PORT}/app-api/auth/google/setup`);
        console.log('  2. Authorize with your Google account');
        console.log('  3. Restart the app');
        console.log('  4. Backups will run automatically every Sunday at midnight');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');
      }
    } catch (error) {
      console.error('Failed to initialize backups:', error.message);
    }
  }
});
