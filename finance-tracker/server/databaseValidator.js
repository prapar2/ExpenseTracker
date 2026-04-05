const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

/**
 * Validates SQLite database integrity
 */

function validateDatabase(dbPath) {
  try {
    if (!fs.existsSync(dbPath)) {
      return { valid: false, error: 'Database file not found' };
    }

    // Check if file is readable and valid SQLite file
    try {
      const buffer = fs.readFileSync(dbPath, { encoding: null });
      const header = buffer.subarray(0, 16).toString('utf-8');
      if (!header.startsWith('SQLite format 3')) {
        return { valid: false, error: 'Invalid SQLite file header' };
      }
    } catch (err) {
      return { valid: false, error: `Cannot read file: ${err.message}` };
    }

    // Try to open and check integrity
    const db = new Database(dbPath, { fileMustExist: true, readonly: true });
    
    try {
      // Run SQLite integrity check
      const result = db.prepare('PRAGMA integrity_check;').all();
      
      if (result.length === 0) {
        return { valid: false, error: 'No integrity check result' };
      }

      const status = result[0].integrity_check;
      
      if (status === 'ok') {
        // Also verify critical tables exist
        const tables = db.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name IN ('taxonomy', 'transactions', 'budgets')
        `).all();

        if (tables.length < 3) {
          return { valid: false, error: 'Missing critical tables' };
        }

        return { valid: true, status: 'Database is healthy' };
      } else {
        return { valid: false, error: `Integrity check failed: ${status}` };
      }
    } finally {
      db.close();
    }
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Get database metadata
 */
function getDatabaseMetadata(dbPath) {
  try {
    const stats = fs.statSync(dbPath);
    
    const db = new Database(dbPath, { fileMustExist: true, readonly: true });
    let rowCount = 0;
    let tableCount = 0;

    try {
      const tables = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table'
      `).all();
      tableCount = tables.length;

      rowCount = db.prepare(`
        SELECT COUNT(*) as total FROM (
          SELECT COUNT(*) FROM transactions
          UNION ALL
          SELECT COUNT(*) FROM budgets
          UNION ALL
          SELECT COUNT(*) FROM taxonomy
        )
      `).get().total;
    } finally {
      db.close();
    }

    return {
      size: stats.size,
      modified: stats.mtime,
      tables: tableCount,
      rows: rowCount
    };
  } catch (error) {
    return { error: error.message };
  }
}

module.exports = {
  validateDatabase,
  getDatabaseMetadata
};
