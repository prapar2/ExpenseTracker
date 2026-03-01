const XLSX = require('xlsx');

// Get FY start month from environment (default to April = 4)
const FY_START_MONTH = parseInt(process.env.FY_START_MONTH) || 4;

/**
 * Parse a date from various formats to YYYY-MM-DD
 */
function parseDate(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // Handle Date objects from Excel
  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      return null;
    }
    return value.toISOString().split('T')[0];
  }

  // Handle Excel serial number
  if (typeof value === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  }

  const str = String(value).trim();

  // ISO string format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const date = new Date(str);
    if (!isNaN(date.getTime())) return str;
  }

  // DD/MM/YYYY format
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const parts = str.split('/');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    // Check if it's DD/MM/YYYY (day > 12 indicates not MM/DD/YYYY)
    if (day > 12) {
      const date = new Date(Date.UTC(year, month - 1, day));
      if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
    }
  }

  // MM/DD/YYYY format (try if DD/MM/YYYY didn't work)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const parts = str.split('/');
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    if (month <= 12 && day <= 31) {
      const date = new Date(Date.UTC(year, month - 1, day));
      if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
    }
  }

  // D-MMM-YY format (e.g., "15-Jun-25")
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const match = str.match(/^(\d{1,2})-([a-zA-Z]{3})-(\d{2,4})$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const monthStr = match[2].toLowerCase();
    let year = parseInt(match[3], 10);
    
    if (year < 100) year += 2000; // Convert 2-digit year to 4-digit
    
    const monthIdx = monthNames.indexOf(monthStr);
    if (monthIdx !== -1) {
      const date = new Date(Date.UTC(year, monthIdx, day));
      if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
    }
  }

  return null;
}

/**
 * Parse a month from various formats to YYYY-MM
 */
function parseMonth(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // Handle Date objects from Excel
  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      return null;
    }
    const year = value.getFullYear();
    const month = value.getMonth() + 1;
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  const str = String(value).trim();

  // YYYY-MM format (already correct)
  if (/^\d{4}-\d{2}$/.test(str)) {
    const date = new Date(str + '-01');
    if (!isNaN(date.getTime())) return str;
  }

  // MMM-YY format (e.g., "Apr-25")
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  let match = str.match(/^([a-zA-Z]{3})-(\d{2})$/);
  if (match) {
    const monthStr = match[1].toLowerCase();
    let year = parseInt(match[2], 10);
    
    if (year < 100) year += 2000;
    
    const monthIdx = monthNames.indexOf(monthStr);
    if (monthIdx !== -1) {
      return `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
    }
  }

  // Month YYYY format (e.g., "April 2025")
  match = str.match(/^([a-zA-Z]+)\s+(\d{4})$/);
  if (match) {
    const monthStr = match[1].toLowerCase();
    const year = parseInt(match[2], 10);
    
    const monthIdx = monthNames.indexOf(monthStr);
    if (monthIdx !== -1) {
      return `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
    }
  }

  // MM/YYYY format (e.g., "04/2025")
  match = str.match(/^(\d{1,2})\/(\d{4})$/);
  if (match) {
    const month = parseInt(match[1], 10);
    const year = parseInt(match[2], 10);
    
    if (month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, '0')}`;
    }
  }

  return null;
}

/**
 * Derive FY start from a parsed YYYY-MM month
 */
function deriveFyStart(parsedYYYYMM, fyStartMonth) {
  const [year, month] = parsedYYYYMM.split('-').map(Number);
  const fyYear = month >= fyStartMonth ? year : year - 1;
  return `${fyYear}-${String(fyStartMonth).padStart(2, '0')}`;
}

/**
 * Normalize transaction type to title case
 */
function normalizeType(value) {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'income' || normalized === 'expense' || normalized === 'saving') {
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
  return null;
}

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

    // Validate and parse actual amount
    if (hasActual) {
      const amount = parseFloat(actualAmount);
      if (isNaN(amount) || !isFinite(amount)) {
        txSkipped = true;
        txSkipReason = txSkipReason || 'Actual Amount is not a valid number';
      } else {
        transaction.amount = Math.abs(amount);
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
          budget.fy_start = deriveFyStart(parsedMonth, FY_START_MONTH);
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

      // Validate and parse budget amount
      const amount = parseFloat(budgetAmount);
      if (isNaN(amount) || !isFinite(amount)) {
        bgSkipped = true;
        bgSkipReason = bgSkipReason || 'Budget Amount is not a valid number';
      } else {
        budget.amount = Math.abs(amount);
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
