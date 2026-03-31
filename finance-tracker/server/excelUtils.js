// Shared Excel utilities for import and export
const XLSX = require('xlsx');

// Get FY start month from environment (default to April = 4)
const FY_START_MONTH = parseInt(process.env.FY_START_MONTH) || 4;

// Column definitions - shared between import and export
const COLUMNS = [
  { key: 'date', header: 'Date' },
  { key: 'month', header: 'Month' },
  { key: 'remarks', header: 'Remarks' },
  { key: 'type', header: 'Type' },
  { key: 'category', header: 'Category' },
  { key: 'subcategory', header: 'Sub-Category' },
  { key: 'actualAmount', header: 'Actual Amount' },
  { key: 'budgetAmount', header: 'Budget Amount' }
];

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
 * Format a YYYY-MM-DD date to DD/MM/YYYY format for Excel
 */
function formatDate(dbDate) {
  if (!dbDate) return '';
  
  const [year, month, day] = dbDate.split('-');
  return `${day}/${month}/${year}`;
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
 * Format a YYYY-MM month to MMM-YY format for Excel
 */
function formatMonth(dbMonth) {
  if (!dbMonth) return '';
  
  const [year, month] = dbMonth.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIdx = parseInt(month, 10) - 1;
  const shortYear = year.slice(-2);
  return `${monthNames[monthIdx]}-${shortYear}`;
}

/**
 * Derive FY start from a parsed YYYY-MM month
 */
function deriveFyStart(parsedYYYYMM) {
  const [year, month] = parsedYYYYMM.split('-').map(Number);
  const fyYear = month >= FY_START_MONTH ? year : year - 1;
  return `${fyYear}-${String(FY_START_MONTH).padStart(2, '0')}`;
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
 * Normalize amount for DB storage based on transaction type (import direction)
 * Returns normalised amount, or null if row should be skipped
 * 
 * INCOME: must be positive, negative = data error → skip
 * EXPENSE/SAVING: flip sign unconditionally
 *   - Excel negative (-500) → DB positive (+500) = normal transaction
 *   - Excel positive (+300) → DB negative (-300) = reversal/cashback/withdrawal
 * Zero → skip (meaningless)
 */
function normaliseAmount(rawAmount, type) {
  if (rawAmount === null || rawAmount === undefined || rawAmount === 0) return null;
  
  if (type === 'Income') {
    // Income must be positive; negative income = data error → skip
    return rawAmount > 0 ? rawAmount : null;
  }
  
  // Expense and Saving: flip the sign unconditionally
  // Negative in Excel = normal expense → positive in DB
  // Positive in Excel = reversal/cashback → negative in DB
  return -rawAmount;
}

/**
 * Denormalize amount for Excel export based on transaction type (export direction)
 * Returns the amount in the format expected by Excel
 * 
 * INCOME: keep positive
 * EXPENSE: flip sign (DB positive → Excel negative)
 * SAVING: flip sign (DB positive → Excel negative)
 */
function denormaliseAmount(dbAmount, type) {
  if (dbAmount === null || dbAmount === undefined || dbAmount === 0) return 0;
  
  if (type === 'Income') {
    // Keep positive for income
    return dbAmount;
  }
  
  // Flip sign for expense and saving
  return -dbAmount;
}

module.exports = {
  FY_START_MONTH,
  COLUMNS,
  parseDate,
  formatDate,
  parseMonth,
  formatMonth,
  deriveFyStart,
  normalizeType,
  normaliseAmount,
  denormaliseAmount
};
