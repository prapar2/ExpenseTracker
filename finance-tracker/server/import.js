const XLSX = require('xlsx');
const { 
  FY_START_MONTH, parseDate, parseMonth, deriveFyStart, 
  normalizeType, normaliseAmount 
} = require('./excelUtils');

/**
 * Parse import file and return transactions and budgets arrays
 */
function parseImportFile(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  // Skip header row (row 0)
  const dataRows = rows.slice(1);

  const transactions = [];
  const budgets = [];
  const errors = [];

  // Valid transaction types
  const validTypes = ['income', 'expense', 'saving'];

  dataRows.forEach((row, index) => {
    const rowNum = index + 2; // +2 because of 0-index and header row

    // Extract columns
    const dateValue = row[0];      // Column A - Date
    const monthValue = row[1];     // Column B - Month
    const remarks = row[2];        // Column C - Remarks
    const typeValue = row[3];      // Column D - Transaction Type
    const category = row[4];       // Column E - Category
    const subcategory = row[5];    // Column F - Sub-Category
    const actualAmount = row[6];   // Column G - Actual Amount
    const budgetAmount = row[7];   // Column H - Budget Amount

    // Check if row is blank (all columns null/empty)
    const isBlankRow = !dateValue && !monthValue && !typeValue && !category && 
                       !subcategory && !actualAmount && !budgetAmount;
    if (isBlankRow) {
      return; // Skip silently
    }

    // Check if both amounts are null/blank
    const hasActual = actualAmount !== null && actualAmount !== undefined && actualAmount !== '';
    const hasBudget = budgetAmount !== null && budgetAmount !== undefined && budgetAmount !== '';
    if (!hasActual && !hasBudget) {
      return; // Skip silently
    }

    // Parse transaction type
    const type = normalizeType(typeValue);
    if (!type) {
      errors.push({ row: rowNum, reason: `Transaction Type "${typeValue}" is not valid` });
    }

    // --- Transaction Import ---
    const transaction = {
      date: null,
      type: type,
      category: null,
      subcategory: null,
      amount: null,
      note: null
    };

    let txSkipped = false;
    let txSkipReason = '';

    // Validate and parse date for transactions
    if (hasActual) {
      if (!dateValue) {
        txSkipped = true;
        txSkipReason = 'Date is blank';
      } else {
        const parsedDate = parseDate(dateValue);
        if (!parsedDate) {
          txSkipped = true;
          txSkipReason = `Date could not be parsed: "${dateValue}"`;
        } else {
          transaction.date = parsedDate;
        }
      }
    }

    // Validate type
    if (!type) {
      txSkipped = true;
      txSkipReason = txSkipReason || 'Transaction Type is blank or invalid';
    }

    // Validate category
    if (!category || String(category).trim() === '') {
      txSkipped = true;
      txSkipReason = txSkipReason || 'Category is blank';
    } else {
      transaction.category = String(category).trim();
    }

    // Validate subcategory
    if (!subcategory || String(subcategory).trim() === '') {
      txSkipped = true;
      txSkipReason = txSkipReason || 'Sub-Category is blank';
    } else {
      transaction.subcategory = String(subcategory).trim();
    }

    // Validate and parse actual amount using normaliseAmount
    if (hasActual) {
      const parsedAmount = parseFloat(actualAmount);
      if (isNaN(parsedAmount) || !isFinite(parsedAmount)) {
        txSkipped = true;
        txSkipReason = txSkipReason || 'Actual Amount is not a valid number';
      } else {
        const normalised = normaliseAmount(parsedAmount, type);
        if (normalised === null) {
          txSkipped = true;
          if (type === 'Income' && parsedAmount < 0) {
            txSkipReason = txSkipReason || 'Income cannot be negative';
          } else {
            txSkipReason = txSkipReason || 'Actual Amount cannot be zero';
          }
        } else {
          transaction.amount = normalised;
        }
      }
    } else {
      txSkipped = true;
      txSkipReason = txSkipReason || 'Actual Amount is blank (row skipped for transactions)';
    }

    // Parse remarks/note
    if (remarks && String(remarks).trim() !== '') {
      transaction.note = String(remarks).trim();
    }

    // Add transaction if valid
    if (!txSkipped && transaction.date && transaction.type && transaction.category && 
        transaction.subcategory && transaction.amount !== null) {
      transactions.push(transaction);
    } else if (txSkipReason) {
      errors.push({ row: rowNum, reason: txSkipReason });
    }

    // --- Budget Import ---
    const budget = {
      fy_start: null,
      month: null,
      type: type,
      category: null,
      subcategory: null,
      amount: null
    };

    let bgSkipped = false;
    let bgSkipReason = '';

    if (hasBudget) {
      // Validate month for budgets
      if (!monthValue) {
        bgSkipped = true;
        bgSkipReason = 'Month is blank';
      } else {
        const parsedMonth = parseMonth(monthValue);
        if (!parsedMonth) {
          bgSkipped = true;
          bgSkipReason = `Month could not be parsed: "${monthValue}"`;
        } else {
          budget.month = parsedMonth;
          budget.fy_start = deriveFyStart(parsedMonth);
        }
      }

      // Validate type
      if (!type) {
        bgSkipped = true;
        bgSkipReason = bgSkipReason || 'Transaction Type is blank or invalid';
      }

      // Validate category
      if (!category || String(category).trim() === '') {
        bgSkipped = true;
        bgSkipReason = bgSkipReason || 'Category is blank';
      } else {
        budget.category = String(category).trim();
      }

      // Validate subcategory
      if (!subcategory || String(subcategory).trim() === '') {
        bgSkipped = true;
        bgSkipReason = bgSkipReason || 'Sub-Category is blank';
      } else {
        budget.subcategory = String(subcategory).trim();
      }

      // Validate and parse budget amount using normaliseAmount
      const parsedBudgetAmount = parseFloat(budgetAmount);
      if (isNaN(parsedBudgetAmount) || !isFinite(parsedBudgetAmount)) {
        bgSkipped = true;
        bgSkipReason = bgSkipReason || 'Budget Amount is not a valid number';
      } else {
        const normalised = normaliseAmount(parsedBudgetAmount, type);
        if (normalised === null) {
          bgSkipped = true;
          if (type === 'Income' && parsedBudgetAmount < 0) {
            bgSkipReason = bgSkipReason || 'Income budget cannot be negative';
          } else {
            bgSkipReason = bgSkipReason || 'Budget Amount cannot be zero';
          }
        } else {
          budget.amount = Math.abs(normalised); // Budgets are always positive in DB
        }
      }
    } else {
      // Skip silently - no budget amount means skip for budget import
      bgSkipped = true;
    }

    // Add budget if valid
    if (!bgSkipped && budget.fy_start && budget.month && budget.type && 
        budget.category && budget.subcategory && budget.amount !== null) {
      budgets.push(budget);
    } else if (hasBudget && bgSkipReason) {
      // Only add error if there was actually a budget amount but it failed
      errors.push({ row: rowNum, reason: bgSkipReason });
    }
  });

  return { transactions, budgets, errors };
}

module.exports = { parseImportFile };
