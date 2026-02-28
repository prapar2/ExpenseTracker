require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
app.use(express.json());

// Taxonomy routes
app.get('/api/taxonomy', (req, res) => {
  res.json(db.getTaxonomy());
});

app.post('/api/taxonomy', (req, res) => {
  const { type, category, subcategory } = req.body;
  if (!type || !category || !subcategory) return res.status(400).json({ error: 'type, category, subcategory required' });
  const result = db.createTaxonomy({ type, category, subcategory });
  res.status(201).json(result);
});

app.put('/api/taxonomy/:id', (req, res) => {
  const result = db.updateTaxonomy(Number(req.params.id), req.body);
  if (!result) return res.status(404).json({ error: 'Taxonomy entry not found' });
  res.json(result);
});

app.delete('/api/taxonomy/:id', (req, res) => {
  const result = db.deleteTaxonomy(Number(req.params.id));
  if (result.status === 404) return res.status(404).json({ error: result.error });
  if (result.status === 400) return res.status(400).json({ error: result.error });
  res.json(result);
});

app.patch('/api/taxonomy/reorder', (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Array of {id, sort_order} required' });
  res.json(db.reorderTaxonomy(req.body));
});

// Transactions routes
app.get('/api/transactions', (req, res) => {
  const { month } = req.query;
  res.json(db.getTransactions(month));
});

app.post('/api/transactions', (req, res) => {
  const { date, type, category, subcategory, amount } = req.body;
  if (!date || !type || !category || !subcategory || amount == null) {
    return res.status(400).json({ error: 'date, type, category, subcategory, amount required' });
  }
  if (amount <= 0) return res.status(400).json({ error: 'amount must be positive' });
  const result = db.createTransaction(req.body);
  res.status(201).json(result);
});

app.put('/api/transactions/:id', (req, res) => {
  const result = db.updateTransaction(Number(req.params.id), req.body);
  if (!result) return res.status(404).json({ error: 'Transaction not found' });
  res.json(result);
});

app.delete('/api/transactions/:id', (req, res) => {
  const result = db.deleteTransaction(Number(req.params.id));
  if (!result) return res.status(404).json({ error: 'Transaction not found' });
  res.json(result);
});

// Budgets routes
app.get('/api/budgets', (req, res) => {
  const { fy_start } = req.query;
  if (!fy_start) return res.status(400).json({ error: 'fy_start required' });
  res.json(db.getBudgets(fy_start));
});

app.post('/api/budgets/bulk', (req, res) => {
  const { fy_start, rows } = req.body;
  if (!fy_start || !Array.isArray(rows)) return res.status(400).json({ error: 'fy_start and rows[] required' });
  res.json(db.upsertBudgets(fy_start, rows));
});

// Dashboard routes
app.get('/api/dashboard/monthly', (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: 'month required' });
  res.json(db.getDashboardMonthly(month));
});

app.get('/api/dashboard/yearly', (req, res) => {
  const { fy_start } = req.query;
  if (!fy_start) return res.status(400).json({ error: 'fy_start required' });
  res.json(db.getDashboardYearly(fy_start));
});

app.post('/api/reset', (req, res) => {
  try { res.json(db.resetDatabase()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Serve client in production
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
