# Export Implementation Plan

## Analysis Summary

### Current Import Implementation (`server/import.js`)

The import system reads an Excel file with these columns:
```
Date | Month | Remarks | Type | Category | Sub-Category | Actual Amount | Budget Amount
```

Key parsing functions:
- `parseDate()` - handles multiple date formats (ISO, DD/MM/YYYY, MM/DD/YYYY, D-MMM-YY)
- `parseMonth()` - handles multiple month formats (YYYY-MM, MMM-YY, "April 2025", MM/YYYY)
- `normaliseAmount()` - converts Excel amounts to DB format (flips sign for expense/saving)
- `deriveFyStart()` - derives FY start from month
- `normalizeType()` - normalizes type to Title Case

### Database Schema (`server/schema.sql`)

**transactions**: id, date, type, category, subcategory, amount, note
**budgets**: id, fy_start, month, type, category, subcategory, amount
**taxonomy**: id, type, category, subcategory, sort_order

---

## Common Code Opportunities

### 1. Column Definitions (SHAREABLE)
Create shared constants for column mapping:
```javascript
// Shared between import and export
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
```

### 2. Date/Month Formatting (NEW FUNCTIONS NEEDED)
Reverse of parseDate/parseMonth - convert DB format to Excel format:
- `formatDate(dbDate)` → returns Excel-friendly date string
- `formatMonth(dbMonth)` → returns "MMM-YY" format

### 3. Amount Denormalization (REUSE LOGIC)
The `normaliseAmount()` function already has the logic - we just invert it for export:
- Income: keep positive (DB: +500 → Excel: +500)
- Expense: flip sign (DB: +500 → Excel: -500)
- Saving: flip sign (DB: +500 → Excel: -500)

### 4. FY Derivation (REUSE EXISTING)
`deriveFyStart()` can be reused for both import and export

---

## Implementation Plan

### Step 1: Refactor import.js to Extract Shared Logic

Create `server/excelUtils.js` with:
```javascript
// Constants
const FY_START_MONTH = parseInt(process.env.FY_START_MONTH) || 4;
const COLUMNS = [...]; // column definitions

// Re-export modified functions
function parseDate(value) { ... }
function formatDate(dbDate) { ... }  // NEW - inverse of parseDate
function parseMonth(value) { ... }
function formatMonth(dbMonth) { ... } // NEW - inverse of parseMonth
function normaliseAmount(rawAmount, type) { ... }  // import direction
function denormaliseAmount(dbAmount, type) { ... } // NEW - export direction
function deriveFyStart(parsedYYYYMM) { ... }
function normalizeType(value) { ... }
```

### Step 2: Create export.js

```javascript
// server/export.js
const XLSX = require('xlsx');
const { 
  COLUMNS, formatDate, formatMonth, denormaliseAmount, deriveFyStart 
} = require('./excelUtils');
const db = require('./db');

function generateExportData(fyStart, month = null) {
  // Get transactions (and optionally budgets) from DB
  const transactions = db.getTransactionsForExport(fyStart, month);
  const budgets = db.getBudgetsForExport(fyStart, month);
  
  // Merge into rows
  const rows = mergeTransactionsAndBudgets(transactions, budgets);
  
  return rows;
}

function createExportWorkbook(exportData) {
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Finance Data');
  return workbook;
}

module.exports = { generateExportData, createExportWorkbook };
```

### Step 3: Add Database Query Functions

In `server/db.js`, add:
```javascript
function getTransactionsForExport(fyStart, month) { ... }
function getBudgetsForExport(fyStart, month) { ... }
```

### Step 4: Add Export API Endpoint

In `server/server.js`:
```javascript
app.get('/app-api/export', (req, res) => {
  const { fy_start, month } = req.query;
  const workbook = export.generateExportFile(fy_start, month);
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=finance-export-${fy_start}.xlsx`);
  
  workbook.write(res);
});
```

### Step 5: Add Frontend Export Button

In `ImportDialog.jsx` or create new `ExportDialog.jsx`:
- Add "Export" button in navigation
- Dialog with FY/month selection
- Call export API and trigger download

---

## File Changes Summary

| File | Action |
|------|--------|
| `server/excelUtils.js` | NEW - shared column definitions, date/month formatters |
| `server/import.js` | MODIFY - import from excelUtils |
| `server/export.js` | NEW - export generation logic |
| `server/db.js` | MODIFY - add export query functions |
| `server/server.js` | MODIFY - add /app-api/export endpoint |
| `client/src/components/ExportDialog.jsx` | NEW - export UI (or extend ImportDialog) |
| `client/src/App.jsx` | MODIFY - add export button to navigation |

---

## Export Format

The exported Excel will match the import format exactly:
```
Date | Month | Remarks | Type | Category | Sub-Category | Actual Amount | Budget Amount
```

This allows users to:
1. Export their data
2. Make modifications in Excel
3. Re-import the modified file

Round-trip compatibility is maintained.
