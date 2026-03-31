// Export functionality - generates Excel files compatible with import format
const XLSX = require('xlsx');
const { 
  COLUMNS, formatDate, formatMonth, denormaliseAmount 
} = require('./excelUtils');
const db = require('./db');

/**
 * Generate export data for transactions and budgets
 * @param {string} fyStart - FY start in YYYY-MM format
 * @param {string|null} month - Optional specific month in YYYY-MM format
 * @returns {Array} Array of row objects matching import format
 */
function generateExportData(fyStart, month = null) {
  // Get transactions
  let transactions;
  if (month) {
    transactions = db.getTransactionsByMonth(month);
  } else {
    transactions = db.getTransactionsByFy(fyStart);
  }

  // Get budgets for the FY (or specific month)
  const budgets = month 
    ? db.getBudgets(month) 
    : db.getBudgetsByFy(fyStart);

  // Create a map of budget keys for quick lookup
  const budgetMap = new Map();
  budgets.forEach(budget => {
    const key = `${budget.type}|${budget.category}|${budget.subcategory}|${budget.month}`;
    budgetMap.set(key, budget.amount);
  });

  // Build export rows matching import format
  // Date | Month | Remarks | Type | Category | Sub-Category | Actual Amount | Budget Amount
  const rows = [];
  
  // Track which budgets we've already exported (to avoid duplicates)
  const exportedBudgetKeys = new Set();

  // Process transactions - include budget amount if available
  transactions.forEach(tx => {
    const row = {
      date: formatDate(tx.date),
      month: formatMonth(tx.month),
      remarks: tx.note || '',
      type: tx.type,
      category: tx.category,
      subcategory: tx.subcategory,
      actualAmount: denormaliseAmount(tx.amount, tx.type),
      budgetAmount: '' // Will be filled if there's a matching budget
    };

    // Look for matching budget
    const budgetKey = `${tx.type}|${tx.category}|${tx.subcategory}|${tx.month}`;
    if (budgetMap.has(budgetKey)) {
      row.budgetAmount = budgetMap.get(budgetKey);
      exportedBudgetKeys.add(budgetKey);
    }

    rows.push(row);
  });

  // Add any budgets that don't have corresponding transactions
  budgets.forEach(budget => {
    const key = `${budget.type}|${budget.category}|${budget.subcategory}|${budget.month}`;
    if (!exportedBudgetKeys.has(key)) {
      rows.push({
        date: '',
        month: formatMonth(budget.month),
        remarks: '',
        type: budget.type,
        category: budget.category,
        subcategory: budget.subcategory,
        actualAmount: '',
        budgetAmount: budget.amount
      });
    }
  });

  return rows;
}

/**
 * Create an Excel workbook from export data
 * @param {Array} exportData - Array of row objects
 * @returns {XLSX.WorkBook} Excel workbook
 */
function createExportWorkbook(exportData) {
  // Create worksheet from data
  const worksheet = XLSX.utils.json_to_sheet(exportData, {
    header: ['date', 'month', 'remarks', 'type', 'category', 'subcategory', 'actualAmount', 'budgetAmount']
  });

  // Set column widths for better readability
  worksheet['!cols'] = [
    { wch: 12 },  // Date
    { wch: 10 },  // Month
    { wch: 30 },  // Remarks
    { wch: 10 },  // Type
    { wch: 15 },  // Category
    { wch: 15 },  // Sub-Category
    { wch: 15 },  // Actual Amount
    { wch: 15 }   // Budget Amount
  ];

  // Create workbook and add worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Finance Data');

  return workbook;
}

/**
 * Generate and write export file to buffer
 * @param {string} fyStart - FY start in YYYY-MM format
 * @param {string|null} month - Optional specific month
 * @returns {Buffer} Excel file buffer
 */
function generateExportBuffer(fyStart, month = null) {
  const exportData = generateExportData(fyStart, month);
  const workbook = createExportWorkbook(exportData);
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
  generateExportData,
  createExportWorkbook,
  generateExportBuffer
};
