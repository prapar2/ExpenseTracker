const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { seedTaxonomy } = require('./seed');

const DB_PATH = process.env.DB_PATH || './finance.db';
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);
seedTaxonomy(db);

// Taxonomy
function getTaxonomy() {
  return db.prepare('SELECT * FROM taxonomy ORDER BY sort_order ASC').all();
}

function createTaxonomy({ type, category, subcategory }) {
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order),0)+1 as next FROM taxonomy').get().next;
  const result = db.prepare('INSERT INTO taxonomy (type, category, subcategory, sort_order) VALUES (?,?,?,?)').run(type, category, subcategory, maxOrder);
  return db.prepare('SELECT * FROM taxonomy WHERE id=?').get(result.lastInsertRowid);
}

function updateTaxonomy(id, { category, subcategory }) {
  const old = db.prepare('SELECT * FROM taxonomy WHERE id=?').get(id);
  if (!old) return null;
  const newCat = category !== undefined ? category : old.category;
  const newSub = subcategory !== undefined ? subcategory : old.subcategory;
  db.prepare('UPDATE taxonomy SET category=?, subcategory=? WHERE id=?').run(newCat, newSub, id);
  // Cascade rename to transactions and budgets
  if (category !== undefined && category !== old.category) {
    db.prepare('UPDATE transactions SET category=? WHERE type=? AND category=?').run(newCat, old.type, old.category);
    db.prepare('UPDATE budgets SET category=? WHERE type=? AND category=?').run(newCat, old.type, old.category);
  }
  if (subcategory !== undefined && subcategory !== old.subcategory) {
    db.prepare('UPDATE transactions SET subcategory=? WHERE type=? AND category=? AND subcategory=?').run(newSub, old.type, old.category, old.subcategory);
    db.prepare('UPDATE budgets SET subcategory=? WHERE type=? AND category=? AND subcategory=?').run(newSub, old.type, old.category, old.subcategory);
  }
  return db.prepare('SELECT * FROM taxonomy WHERE id=?').get(id);
}

function deleteTaxonomy(id) {
  const row = db.prepare('SELECT * FROM taxonomy WHERE id=?').get(id);
  if (!row) return { error: 'Not found', status: 404 };
  const txCount = db.prepare('SELECT COUNT(*) as c FROM transactions WHERE type=? AND category=? AND subcategory=?').get(row.type, row.category, row.subcategory).c;
  if (txCount > 0) return { error: `${row.subcategory} has ${txCount} transaction${txCount > 1 ? 's' : ''}. Reassign or delete those transactions first.`, status: 400 };
  db.prepare('DELETE FROM budgets WHERE type=? AND category=? AND subcategory=?').run(row.type, row.category, row.subcategory);
  db.prepare('DELETE FROM taxonomy WHERE id=?').run(id);
  return { deleted: true };
}

function reorderTaxonomy(items) {
  const update = db.prepare('UPDATE taxonomy SET sort_order=? WHERE id=?');
  const runAll = db.transaction((rows) => { for (const r of rows) update.run(r.sort_order, r.id); });
  runAll(items);
  return { updated: items.length };
}

// Transactions
function getTransactions(month) {
  if (month) {
    return db.prepare('SELECT * FROM transactions WHERE date LIKE ? ORDER BY date DESC').all(month + '%');
  }
  return db.prepare('SELECT * FROM transactions ORDER BY date DESC').all();
}

function createTransaction({ date, type, category, subcategory, amount, note }) {
  const r = db.prepare('INSERT INTO transactions (date,type,category,subcategory,amount,note) VALUES (?,?,?,?,?,?)').run(date, type, category, subcategory, amount, note || null);
  return db.prepare('SELECT * FROM transactions WHERE id=?').get(r.lastInsertRowid);
}

function updateTransaction(id, fields) {
  const old = db.prepare('SELECT * FROM transactions WHERE id=?').get(id);
  if (!old) return null;
  const updated = { ...old, ...fields };
  db.prepare('UPDATE transactions SET date=?,type=?,category=?,subcategory=?,amount=?,note=? WHERE id=?')
    .run(updated.date, updated.type, updated.category, updated.subcategory, updated.amount, updated.note || null, id);
  return db.prepare('SELECT * FROM transactions WHERE id=?').get(id);
}

function deleteTransaction(id) {
  const r = db.prepare('DELETE FROM transactions WHERE id=?').run(id);
  return r.changes > 0 ? { deleted: true } : null;
}

// Budgets
function getBudgets(fy_start) {
  return db.prepare('SELECT * FROM budgets WHERE fy_start=? ORDER BY month ASC').all(fy_start);
}

function upsertBudgets(fy_start, rows) {
  const upsert = db.prepare('INSERT OR REPLACE INTO budgets (fy_start,month,type,category,subcategory,amount) VALUES (?,?,?,?,?,?)');
  const runAll = db.transaction((items) => { for (const r of items) upsert.run(fy_start, r.month, r.type, r.category, r.subcategory, r.amount); });
  runAll(rows);
  return { upserted: rows.length };
}

// Dashboard monthly
function getDashboardMonthly(month) {
  const txRows = db.prepare('SELECT type, SUM(amount) as total FROM transactions WHERE date LIKE ? GROUP BY type').all(month + '%');
  const totals = { income: 0, expense: 0, saving: 0 };
  for (const r of txRows) {
    if (r.type === 'Income') totals.income = r.total;
    else if (r.type === 'Expense') totals.expense = r.total;
    else if (r.type === 'Saving') totals.saving = r.total;
  }
  totals.net = totals.income - totals.expense - totals.saving;

  // Extract fy_start from month: April of same year if month >= 04, else April of prev year
  const [yr, mo] = month.split('-').map(Number);
  const fyYear = mo >= 4 ? yr : yr - 1;
  const fy_start = `${fyYear}-04`;

  const budgetRows = db.prepare('SELECT type,category,subcategory,amount FROM budgets WHERE fy_start=? AND month=?').all(fy_start, month);
  const actualRows = db.prepare('SELECT type,category,subcategory,SUM(amount) as actual FROM transactions WHERE date LIKE ? GROUP BY type,category,subcategory').all(month + '%');

  const budgetMap = {};
  for (const b of budgetRows) {
    const k = `${b.type}|${b.category}|${b.subcategory}`;
    budgetMap[k] = b.amount;
  }
  const actualMap = {};
  for (const a of actualRows) {
    const k = `${a.type}|${a.category}|${a.subcategory}`;
    actualMap[k] = a.actual;
  }

  const allKeys = new Set([...Object.keys(budgetMap), ...Object.keys(actualMap)]);
  const budgetVsActual = [];
  for (const k of allKeys) {
    const [type, category, subcategory] = k.split('|');
    const budget = budgetMap[k] ?? null;
    const actual = actualMap[k] ?? 0;
    const variance = budget !== null ? actual - budget : null;
    const pctUsed = budget !== null && budget > 0 ? actual / budget : null;
    budgetVsActual.push({ type, category, subcategory, budget, actual, variance, pctUsed });
  }

  return { summary: totals, budgetVsActual };
}

// Dashboard yearly
function getDashboardYearly(fy_start) {
  const months = [];
  const [fyYr, fyMo] = fy_start.split('-').map(Number);
  for (let i = 0; i < 12; i++) {
    const d = new Date(fyYr, fyMo - 1 + i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const txRows = db.prepare('SELECT substr(date,1,7) as month, type, SUM(amount) as total FROM transactions WHERE date >= ? AND date < ? GROUP BY month, type')
    .all(fy_start + '-01', months[11] + '-32');
  const budgetRows = db.prepare('SELECT month,type,SUM(amount) as total FROM budgets WHERE fy_start=? GROUP BY month,type').all(fy_start);

  const actMap = {};
  for (const r of txRows) {
    const k = `${r.month}|${r.type}`;
    actMap[k] = r.total;
  }
  const budMap = {};
  for (const r of budgetRows) {
    const k = `${r.month}|${r.type}`;
    budMap[k] = r.total;
  }

  const monthData = months.map(m => ({
    month: m,
    income_actual: actMap[`${m}|Income`] || 0,
    expense_actual: actMap[`${m}|Expense`] || 0,
    saving_actual: actMap[`${m}|Saving`] || 0,
    income_budget: budMap[`${m}|Income`] || 0,
    expense_budget: budMap[`${m}|Expense`] || 0,
    saving_budget: budMap[`${m}|Saving`] || 0,
  }));

  const ytd = { income: 0, expense: 0, saving: 0, net: 0 };
  for (const m of monthData) {
    ytd.income += m.income_actual;
    ytd.expense += m.expense_actual;
    ytd.saving += m.saving_actual;
  }
  ytd.net = ytd.income - ytd.expense - ytd.saving;

  // Budget vs actual yearly rollup
  const bRows = db.prepare('SELECT type,category,subcategory,SUM(amount) as total FROM budgets WHERE fy_start=? GROUP BY type,category,subcategory').all(fy_start);
  const aRows = db.prepare('SELECT type,category,subcategory,SUM(amount) as total FROM transactions WHERE date >= ? AND date <= ? GROUP BY type,category,subcategory')
    .all(fy_start + '-01', months[11] + '-31');
  const ybMap = {};
  for (const r of bRows) ybMap[`${r.type}|${r.category}|${r.subcategory}`] = r.total;
  const yaMap = {};
  for (const r of aRows) yaMap[`${r.type}|${r.category}|${r.subcategory}`] = r.total;
  const allKeys = new Set([...Object.keys(ybMap), ...Object.keys(yaMap)]);
  const budgetVsActual = [];
  for (const k of allKeys) {
    const [type, category, subcategory] = k.split('|');
    const budget = ybMap[k] ?? null;
    const actual = yaMap[k] ?? 0;
    const variance = budget !== null ? actual - budget : null;
    const pctUsed = budget !== null && budget > 0 ? actual / budget : null;
    budgetVsActual.push({ type, category, subcategory, budget, actual, variance, pctUsed });
  }

  return { months: monthData, ytd, budgetVsActual };
}

module.exports = {
  getTaxonomy, createTaxonomy, updateTaxonomy, deleteTaxonomy, reorderTaxonomy,
  getTransactions, createTransaction, updateTransaction, deleteTransaction,
  getBudgets, upsertBudgets,
  getDashboardMonthly, getDashboardYearly,
};
