# IMPLEMENTATION PROMPT — Excel Import Feature
## Personal Finance Tracker · Claude Code Instruction

---

## CONTEXT

You are implementing an Excel import feature on an existing Personal Finance Tracker
application. The application is built with React 18 + Vite (frontend), Express.js
(backend), and SQLite via better-sqlite3 (database). All constraints from the
Technology Guardrail document remain fully in force. Do not deviate from any of them.

Read the Technology Guardrail and Functional Specification before writing a single line
of code. This feature is an additive extension — it must not touch, refactor, or
break any existing functionality.

---

## FEATURE OVERVIEW

Add an Import button to the application's top navigation bar, positioned beside the
existing Settings button. On click, it opens a modal dialog where the user uploads an
Excel file (.xlsx). The system parses the file and performs two independent import
operations from the same uploaded file:

1. **Transaction Import** — inserts rows into the `transactions` table
2. **Budget Import** — upserts rows into the `budgets` table

Both imports happen in a single upload action. The user does not choose between them —
the system always attempts both and reports results for each separately.

---

## EXCEL FILE FORMAT

The uploaded Excel file has a **single sheet** with the following columns in this exact
order. Row 1 is the header row and must be skipped during import.

| Column | Header text in Excel | Data type | Example values |
|--------|---------------------|-----------|----------------|
| A | Date | Date / String | 2025-06-15, 15/06/2025, 44927 (Excel serial) |
| B | Month | String | "Apr-25", "2025-04", "April 2025" |
| C | Remarks | String / null | "Petrol fill", null |
| D | Transaction Type | String | "Income", "Expense", "Saving" |
| E | Category | String | "Salary", "Automobiles", "Equity" |
| F | Sub-Category | String | "Paycheck", "Petrol", "Mutual Fund" |
| G | Actual Amount | Number / null | 5000, -1200.50, null |
| H | Budget Amount | Number / null | 5000, -1500, null |

**Critical notes on the source data:**

- Expense and Saving amounts in column G (Actual Amount) are stored as **negative numbers**
  in the Excel file. Income amounts are positive. During import, always store the
  **absolute value** (`Math.abs()`) in the database — never store negative amounts.
  Direction is already captured by the Transaction Type field.
- Budget amounts in column H (Budget Amount) follow the same sign convention.
  Always store as absolute value regardless of sign.
- Blank rows (all columns null/empty) must be silently skipped.
- Rows where both Actual Amount (col G) and Budget Amount (col H) are null/blank must
  be silently skipped.
- The Transaction Type field must be exactly "Income", "Expense", or "Saving"
  (case-insensitive match, normalise to title case on import).

---

## FIELD MAPPING — TRANSACTIONS IMPORT

Use these columns from the Excel row to build a transaction record:

| DB field (`transactions` table) | Source Excel column | Transformation rule |
|----------------------------------|---------------------|---------------------|
| `date` | Column A — Date | Parse to ISO 8601 string: YYYY-MM-DD. Handle multiple formats (see Date Parsing section below). |
| `type` | Column D — Transaction Type | Normalise to title case: "income" → "Income". |
| `category` | Column E — Category | Trim whitespace. Use as-is. |
| `subcategory` | Column F — Sub-Category | Trim whitespace. Use as-is. |
| `amount` | Column G — Actual Amount | `Math.abs(value)`. Skip this row for transaction import if null/blank. |
| `note` | Column C — Remarks | Use as-is if non-empty string. Store null if blank/empty. |

**Skip a row for Transaction Import if:**
- Column A (Date) is null, blank, or unparseable
- Column D (Transaction Type) is null, blank, or not one of Income/Expense/Saving
- Column E (Category) is null or blank
- Column F (Sub-Category) is null or blank
- Column G (Actual Amount) is null or blank

If a row is skipped for transaction import, record it in the error summary with its
row number and the reason. Do not abort the entire import.

---

## FIELD MAPPING — BUDGET IMPORT

Use these columns from the Excel row to build a budget record:

| DB field (`budgets` table) | Source Excel column | Transformation rule |
|----------------------------|---------------------|---------------------|
| `fy_start` | Column B — Month | Derive FY start from the month (see FY Derivation section below). |
| `month` | Column B — Month | Parse to YYYY-MM format (see Month Parsing section below). |
| `type` | Column D — Transaction Type | Normalise to title case. |
| `category` | Column E — Category | Trim whitespace. |
| `subcategory` | Column F — Sub-Category | Trim whitespace. |
| `amount` | Column H — Budget Amount | `Math.abs(value)`. Skip this row for budget import if null/blank. |

**Skip a row for Budget Import if:**
- Column B (Month) is null, blank, or unparseable
- Column D (Transaction Type) is null, blank, or not one of Income/Expense/Saving
- Column E (Category) is null or blank
- Column F (Sub-Category) is null or blank
- Column H (Budget Amount) is null or blank

Budget import uses **INSERT OR REPLACE** (upsert) on the unique key
`(fy_start, month, type, category, subcategory)`. This means re-importing the same
file is safe and idempotent — it overwrites the previous budget value for that
combination. Do not duplicate. Do not error on conflict.

---

## DATE PARSING (Column A)

Excel dates come in multiple formats. The parser must handle all of them:

| Format | Example | Parse approach |
|--------|---------|----------------|
| ISO string | "2025-06-15" | Direct — split on `-` |
| DD/MM/YYYY | "15/06/2025" | Split on `/`, reorder |
| Excel serial number | 45123 (number) | Convert: `new Date(Date.UTC(1899, 11, 30) + serial * 86400000)` |
| MM/DD/YYYY | "06/15/2025" | Attempt after DD/MM/YYYY fails (day > 12 signals US format) |
| D-MMM-YY | "15-Jun-25" | Parse month name, construct date |

If after all attempts the date cannot be parsed to a valid calendar date, skip the row
for transaction import and record the error. Do not throw — continue to the next row.

Output format for the `date` DB field: always `YYYY-MM-DD` as a plain string.

---

## MONTH PARSING (Column B)

The Month column is used only for Budget Import. Parse it to `YYYY-MM` format.

| Format | Example | Parse approach |
|--------|---------|----------------|
| MMM-YY | "Apr-25" | "Apr" → month 4, "25" → 2025. Output: "2025-04" |
| YYYY-MM | "2025-04" | Already correct. Use as-is. |
| Month YYYY | "April 2025" | Parse month name to number. Output: "2025-04" |
| MM/YYYY | "04/2025" | Split on `/`. Output: "2025-04" |

If the month cannot be parsed, skip the row for budget import and record the error.

---

## FY START DERIVATION

The `fy_start` field on the budgets table stores the first month of the financial year
that contains the parsed month. The app's FY start month is configurable (default:
April = month 4). Read the configured FY start month from the `.env` file or default
to 4 (April).

Derivation logic:

```javascript
// fyStartMonth = 4 (April) by default, configurable
function deriveFyStart(parsedYYYYMM, fyStartMonth) {
  const [year, month] = parsedYYYYMM.split('-').map(Number);
  // If this month is on or after the FY start month, FY started in this calendar year
  // If before the FY start month, FY started in the previous calendar year
  const fyYear = month >= fyStartMonth ? year : year - 1;
  return `${fyYear}-${String(fyStartMonth).padStart(2, '0')}`;
}
// Example: month = "2025-02", fyStartMonth = 4 → fyYear = 2024 → "2024-04"
// Example: month = "2025-06", fyStartMonth = 4 → fyYear = 2025 → "2025-04"
```

---

## FILES TO CREATE (new files only)

### 1. `client/src/components/ImportDialog.jsx`
The modal dialog component. Responsibilities:
- Renders a modal overlay with a file input accepting `.xlsx` only
- Shows upload state: idle → uploading → results
- On file select, immediately calls the upload handler (no separate submit button needed)
- Displays the result summary after import (see Result Display section)
- Close button dismisses the modal and resets state

### 2. `server/import.js`
Server-side import logic. Responsibilities:
- Exports a single function: `parseImportFile(buffer)` that returns
  `{ transactions: [], budgets: [], errors: [] }`
- Uses the `xlsx` npm package to parse the Excel buffer
- Contains all date parsing, month parsing, FY derivation, and field mapping logic
- Does NOT interact with the database — returns plain arrays only
- Pure function: same input always produces same output

**Why a separate file:** This is the ONE exception to the "all server logic in server.js
and db.js" rule. The import parsing logic is complex enough (~120 lines) that embedding
it in server.js would push server.js well past its 300-line limit. This file is
additive — it does not replace any existing file.

---

## FILES TO MODIFY (surgical changes only)

### 3. `server/server.js`
Add ONE new route only. Insert it with the other `/api` routes — do not touch anything
else in this file:

```javascript
// Multipart file upload — use multer (in-memory storage, no disk writes)
const multer  = require('multer');
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const { parseImportFile } = require('./import');

app.post('/api/import', upload.single('file'), (req, res) => {
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
```

### 4. `server/db.js`
Add TWO new functions only. Insert them at the end of the existing functions — do not
touch any existing function:

```javascript
// Bulk insert transactions — skips rows that fail DB constraints
// Returns { inserted: N }
function bulkInsertTransactions(rows) {
  const stmt = db.prepare(
    'INSERT INTO transactions (date, type, category, subcategory, amount, note) VALUES (?,?,?,?,?,?)'
  );
  const insertMany = db.transaction((rows) => {
    let inserted = 0;
    for (const r of rows) {
      try {
        stmt.run(r.date, r.type, r.category, r.subcategory, r.amount, r.note ?? null);
        inserted++;
      } catch (_) { /* skip constraint violations silently */ }
    }
    return inserted;
  });
  return { inserted: insertMany(rows) };
}

// Bulk upsert budgets — idempotent, uses INSERT OR REPLACE
// Returns { upserted: N }
function bulkUpsertBudgets(rows) {
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO budgets (fy_start, month, type, category, subcategory, amount)
     VALUES (?,?,?,?,?,?)`
  );
  const upsertMany = db.transaction((rows) => {
    for (const r of rows) {
      stmt.run(r.fy_start, r.month, r.type, r.category, r.subcategory, r.amount);
    }
    return rows.length;
  });
  return { upserted: upsertMany(rows) };
}

// Add to module.exports:
// bulkInsertTransactions, bulkUpsertBudgets
```

### 5. `client/src/App.jsx`
Add the Import button to the navigation bar, beside the Settings button/icon.
Add `useState` for `showImport` boolean. Render `<ImportDialog>` conditionally.
No other changes to App.jsx.

---

## NEW NPM PACKAGES REQUIRED

Two packages are needed. Both are additive — they do not replace anything existing.

| Package | Purpose | Install command |
|---------|---------|-----------------|
| `xlsx` | Parse Excel .xlsx binary buffer into row arrays | `npm install xlsx` |
| `multer` | Handle multipart/form-data file upload in Express | `npm install multer` |

Add both to `dependencies` in package.json (not devDependencies — both run at runtime).

---

## RESULT DISPLAY

After import completes, the ImportDialog shows a result panel inside the modal
(do not close automatically). Display:

```
Import Complete

Transactions    ✅ 42 inserted    ⚠ 3 skipped
Budgets         ✅ 108 upserted

Errors (3 rows skipped):
  Row 7  — Date could not be parsed: "not a date"
  Row 14 — Actual Amount is blank (row skipped for transactions)
  Row 22 — Transaction Type "Transfer" is not valid
```

Colour conventions (use existing Tailwind tokens from the guardrail):
- Inserted/upserted counts: `text-positive` (green)
- Skipped counts: `text-warning` (amber)
- Error rows list: `text-negative` (red), small font

A "Close" button and an "Import Another File" button appear below the results.
"Import Another File" resets the dialog to idle state without closing it.

---

## VALIDATION RULES (applied in `import.js` before returning)

Apply these checks row by row. On failure, add to the errors array and skip the row
for the relevant import type (transaction, budget, or both). Never abort the full
import.

1. Transaction Type must be one of: Income, Expense, Saving (case-insensitive).
   Normalise to title case before storing.
2. Category and Subcategory must be non-empty strings after trimming whitespace.
3. Amount must be a finite number. NaN, Infinity, and non-numeric strings are invalid.
4. For transactions: Date must parse to a valid calendar date.
5. For budgets: Month must parse to a valid YYYY-MM value.
6. Do NOT validate Category/Subcategory against the taxonomy table.
   The import allows categories and subcategories that don't yet exist in the taxonomy.
   This is intentional — the user may import historical data before setting up their
   full taxonomy. The app will still record the transaction; it just won't cascade-match
   in dropdowns until the taxonomy is updated.

---

## WHAT NOT TO DO

- Do not modify any existing route handler in server.js
- Do not modify any existing function in db.js
- Do not modify any existing page component (Dashboard, Transactions, Budget, Categories)
- Do not add a new context or hook for import — the result is transient UI state,
  managed locally in ImportDialog.jsx with useState only
- Do not write the parsed data to disk at any point — keep everything in memory
  (multer memoryStorage → buffer → parsed arrays → db inserts → response)
- Do not add a progress bar or streaming response — a single POST with a JSON response
  is sufficient for files up to 5MB
- Do not validate against the live taxonomy on import (see rule 6 above)
- Do not refresh the entire app after import — after the user closes the dialog,
  pages that display transactions or budgets will re-fetch when next navigated to
  (existing fetch-on-mount behaviour handles this)

---

## IMPLEMENTATION SEQUENCE

Follow this order exactly. Verify each step before proceeding.

1. Install `xlsx` and `multer` packages.
2. Create `server/import.js` with `parseImportFile(buffer)`. Write it completely.
   Test it independently with `node -e "..."` using a sample buffer before wiring it up.
3. Add `bulkInsertTransactions` and `bulkUpsertBudgets` to `server/db.js`.
4. Add the `/api/import` route to `server/server.js`.
5. Test the endpoint with a curl command using the actual Excel file before building UI:
   `curl -X POST http://localhost:3001/api/import -F "file=@Input.xlsx"`
   Verify the JSON response shape matches the spec above.
6. Create `client/src/components/ImportDialog.jsx`.
7. Add the Import button and ImportDialog to `App.jsx`.
8. Test end-to-end in the browser.

---

## SUMMARY OF CHANGES

| What | Type | Lines estimate |
|------|------|---------------|
| `server/import.js` | New file | ~120 lines |
| `server/db.js` | +2 functions at end | ~25 lines added |
| `server/server.js` | +1 route + 2 requires at top | ~15 lines added |
| `client/src/components/ImportDialog.jsx` | New file | ~110 lines |
| `client/src/App.jsx` | +1 button + conditional render | ~8 lines added |
| `package.json` | +2 packages | 2 lines added |

**Total new/modified lines: ~280. Zero changes to existing logic.**
