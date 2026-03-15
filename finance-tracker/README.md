# Personal Finance Tracker

A single-user personal finance tracking web application for recording transactions, managing budgets, and viewing financial dashboards — scoped to a selected Financial Year (April–March by default). All amounts are in INR (₹).

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Docker](#docker)
3. [Home Assistant OS Add-on](#home-assistant-os-add-on)
4. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Architecture & Design Decisions](#architecture--design-decisions)
6. [Database Schema](#database-schema)
7. [API Reference](#api-reference)
8. [Frontend Pages](#frontend-pages)
9. [Components](#components)
10. [Contexts](#contexts)
11. [Hooks](#hooks)
12. [Utilities](#utilities)
13. [Seed Data](#seed-data)
14. [Configuration](#configuration)
15. [File Line Limits](#file-line-limits)
16. [Known Constraints](#known-constraints)

---

## Quick Start

### Option A — Docker (recommended)

```bash
cd finance-tracker
docker compose up --build
```

Open **http://localhost:3001** in your browser. The app and API are both served by the single Express container.

### Option B — Local development

```bash
# Requires Node.js LTS
cd finance-tracker
npm install

# Start server (port 3001) + Vite client (port 5173) simultaneously
npm run dev
```

- **Client (Vite HMR):** http://localhost:5173
- **API Server:** http://localhost:3001

```bash
# Build client for production, then run server
npm run build
npm start
```

---

## Docker

The application ships as a single container. The Vite client is built inside Docker and served as static files by the same Express server that handles the API.

### Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build: builder stage compiles the Vite client, runner stage serves it |
| `docker-compose.yml` | Defines the service, port mapping, volume, and environment |
| `.dockerignore` | Excludes `node_modules/`, `client/dist/`, `.env`, and `*.db` files from the build context |

### How it works

**Stage 1 — builder (`node:22-alpine`)**
1. Installs all dependencies (including devDeps needed by Vite)
2. Runs `npm run build` → produces `client/dist/`

**Stage 2 — runner (`node:22-alpine`)**
1. Installs production dependencies only (`npm ci --omit=dev`) — no Vite, Tailwind, or React build tools
2. Copies `client/dist/` from the builder stage
3. Copies `server/` source
4. Starts `node server/server.js` which serves both the API and the built React app

**Data persistence**
The SQLite database is stored at `/data/finance.db` inside a named Docker volume (`finance-db`). Data survives container restarts and image rebuilds. The `.env` file is excluded from the image — environment variables are injected by `docker-compose.yml`.

### Commands

```bash
# Build image and start container (detached)
docker compose up --build -d

# Build image and start with live logs
docker compose up --build

# View running containers
docker compose ps

# Tail logs
docker compose logs -f

# Stop container (data volume preserved)
docker compose down

# Stop and permanently delete all data
docker compose down -v
```

### Environment (Docker)

Set in `docker-compose.yml` — do **not** rely on `.env` inside the container:

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Disables dev-only behaviour |
| `PORT` | `3001` | Express server port |
| `DB_PATH` | `/data/finance.db` | Absolute path inside the named volume |

### Ports

| Host | Container | Service |
|------|-----------|---------|
| `3001` | `3001` | Express (API + static React app) |

---

## Home Assistant OS Add-on

This application is also available as a Home Assistant OS add-on, allowing you to run it directly within your Home Assistant instance.

### Installation

1. Open Home Assistant → **Settings** → **Add-ons** → **Add-on Store**
2. Click the three-dot menu (⋮) top-right → **Repositories**
3. Paste: `https://github.com/prapar2/ExpenseTracker`
4. Click **Add** → **Close**
5. Find "Personal Finance Tracker" in the Add-on Store and click **Install**

### First Run

On first installation, the add-on will:
- Automatically create the SQLite database at `/data/finance.db`
- Seed the default taxonomy (Income, Expense, Saving categories)
- Start the Express server on port 3001

### Configuration

The add-on comes pre-configured with sensible defaults:
- **Database path:** `/data/finance.db` (persists across updates)
- **Server port:** `3001`
- **Ingress:** Enabled — access via "Open Web UI" button or sidebar

### Updating

To update the add-on:
1. Push code changes to GitHub
2. Bump the version in `finance-tracker-addon/config.yaml`
3. In Home Assistant, click **Update** on the add-on card

Your data in `/data/finance.db` is preserved during updates.

---

## Technology Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Runtime | Node.js LTS | Requires v11+ of better-sqlite3 for Node 25 compatibility |
| Frontend | React 18 | JSX only — no TypeScript |
| Build Tool | Vite 5 | Config lives in `client/vite.config.js` |
| Styling | Tailwind CSS 3 | Utility classes only; colour tokens defined in `vite.config.js` inline PostCSS config |
| State | React Context + useReducer | Three contexts maximum |
| Charts | Recharts 2 | Bar, Line, Pie/Donut charts |
| Backend | Express 4 | Plain JSON over HTTP REST |
| Database | SQLite via better-sqlite3 11 | Synchronous API, no async/await in db layer |
| ORM | None | Raw SQL only, all queries in `server/db.js` |
| Auth | None | Single-user, no authentication |
| Client Routing | React Router v6 | Hash-free HTML5 history |
| Dev Process | concurrently + nodemon | Hot-reload for both client and server |

### Runtime Dependencies

```json
{
  "better-sqlite3": "^11.10.0",
  "dotenv": "^17.x",
  "express": "^4.19.2",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.23.1",
  "recharts": "^2.12.7"
}
```

### Dev Dependencies

```json
{
  "@vitejs/plugin-react": "^4.3.1",
  "autoprefixer": "^10.4.19",
  "concurrently": "^8.2.2",
  "nodemon": "^3.1.4",
  "postcss": "^8.4.39",
  "tailwindcss": "^3.4.6",
  "vite": "^5.3.1"
}
```

---

## Project Structure

```
finance-tracker/
├── package.json                  # Single root package.json; scripts for dev/build/start
├── .env                          # PORT=3001, DB_PATH=./finance.db (local dev only)
├── .gitignore
├── Dockerfile                    # Multi-stage build: builder (Vite) → runner (Express)
├── docker-compose.yml            # Service definition, port 3001, named volume finance-db
├── .dockerignore                 # Excludes node_modules, dist, .env, *.db from build context
│
├── server/
│   ├── server.js                 # Express app + all route handlers (≤360 lines)
│   ├── db.js                     # SQLite connection + all SQL queries incl. resetDatabase() (≤300 lines)
│   ├── import.js                 # Excel file parsing for import feature (~362 lines)
│   ├── schema.sql                # CREATE TABLE statements
│   └── seed.js                   # Default taxonomy seed data (76 entries)
│
└── client/
    ├── package.json              # { "type": "module" } — marks client as ESM
    ├── index.html
    ├── vite.config.js            # Vite config with inline Tailwind PostCSS plugin
    ├── tailwind.config.js        # Colour token definitions (referenced by vite config)
    ├── postcss.config.js
    └── src/
        ├── main.jsx              # ReactDOM.createRoot entry point
        ├── App.jsx               # BrowserRouter + TaxonomyProvider + nav + Settings modal + Import modal (FY selector + factory reset + import) (241 lines)
        ├── index.css             # @tailwind base/components/utilities
        │
        ├── pages/
        │   ├── Dashboard.jsx     # Monthly/yearly reporting, charts, drill-through (164 lines)
        │   ├── Transactions.jsx  # Transaction entry form + list + filters (122 lines)
        │   ├── Budget.jsx        # 12-month budget grid per FY (143 lines)
        │   └── Categories.jsx    # 3-panel taxonomy manager (211 lines)
        │
        ├── components/
        │   ├── BudgetGrid.jsx         # Inline-editable 12-month grid with row/col actions
        │   ├── BudgetVsActualTable.jsx # Reusable Budget vs Actual table (monthly + yearly)
        │   ├── ConfirmDialog.jsx       # Modal confirmation dialog (dismissible by button only)
        │   ├── FilterBar.jsx          # Multi-select Type/Category/Subcategory filter pills
        │   ├── ImportDialog.jsx       # Modal dialog for Excel import (upload + results display)
        │   ├── KPICard.jsx            # Single metric card with optional drill-through click
        │   ├── MonthPicker.jsx        # 12-month grid modal picker
        │   ├── ProjectionCard.jsx     # Yearly projection display with warning banner
        │   ├── TransactionForm.jsx     # Controlled form for create/edit transactions
        │   └── TransactionList.jsx    # Sortable table with edit/delete actions
        │
        ├── context/
        │   ├── TaxonomyContext.jsx    # Global taxonomy state + helper selectors
        │   ├── TransactionContext.jsx # Transaction state holder
        │   └── BudgetContext.jsx      # Budget state holder
        │
        ├── hooks/
        │   ├── useDashboard.js        # fetch() for monthly and yearly dashboard APIs
        │   ├── useBudget.js           # fetch() for budget GET + bulk upsert
        │   ├── useReset.js            # fetch() for POST /api/reset (factory reset)
        │   ├── useTaxonomy.js         # Re-exports useTaxonomy + action functions
        │   └── useTransactions.js     # fetch() for transaction CRUD operations
        │
        └── utils/
            ├── dateUtils.js           # FY calculation, month labels, elapsed/current/future
            ├── formatUtils.js         # formatINR, formatPct, truncateNote
            └── calcUtils.js           # calcNet, calcProjection, calcVariance, calcPctUsed
```

---

## Architecture & Design Decisions

### Financial Year Scoping
All screens scope to a single selected Financial Year at a time. The active FY is chosen from the Settings modal — a rolling window of 4 FYs is always available (2 years back, current, 1 year forward). The FY label (e.g. "FY 2025-26") is displayed in the navbar. Changing the selected FY recalculates boundaries in-memory across all pages — no data is deleted. The FY start month is fixed at April (configurable in code via `FY_START_MONTH` constant in `App.jsx`).

### Transaction Direction
Three fixed types: **Income**, **Expense**, **Saving**.
- **Income**: Amounts must always be positive. Negative income is treated as a data error.
- **Expense** & **Saving**: Allow negative amounts. A negative Expense represents a refund/reversal (e.g., cashback). A negative Saving represents a withdrawal (e.g., emergency fund withdrawal).
- Net = Income – Expense – Saving (negative amounts reduce the total).
- Negative amounts display in amber colour in the transaction list for clarity.
- Direction logic lives exclusively in `calcUtils.js`.

### Denormalised Database
No foreign keys. Categories and subcategories are stored as plain strings in all three tables. Renames cascade via `UPDATE … WHERE old_value` — no join complexity. The `UNIQUE` constraint on `budgets` enables `INSERT OR REPLACE` upserts.

### State Management
Three React Contexts maximum:
- `TaxonomyContext` — loaded once on app start, shared across all pages
- `TransactionContext` — simple holder used on Transactions page
- `BudgetContext` — simple holder used on Budget page

Pages use hooks (`useTransactions`, `useBudget`, `useDashboard`) which own all `fetch()` calls. Components never call fetch directly.

### Tailwind Configuration Note
The Tailwind PostCSS plugin is configured **inline inside `client/vite.config.js`** rather than in `tailwind.config.js`. This is required because running `vite build client` from the project root causes Tailwind's glob resolver to lose context of the `client/` directory. The inline config passes absolute paths resolved via `import.meta.dirname`.

### ESM / CJS Split
The root `package.json` does **not** set `"type": "module"` because `server/server.js` and `server/db.js` use CommonJS (`require`). The `client/package.json` sets `"type": "module"` to satisfy Vite's ESM requirement for config files.

---

## Database Schema

```sql
-- Taxonomy: categories and subcategories
CREATE TABLE IF NOT EXISTS taxonomy (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT    NOT NULL,   -- "Income" | "Expense" | "Saving"
  category    TEXT    NOT NULL,
  subcategory TEXT    NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- Transactions: individual financial records
CREATE TABLE IF NOT EXISTS transactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  date        TEXT    NOT NULL,   -- ISO 8601: YYYY-MM-DD
  type        TEXT    NOT NULL,
  category    TEXT    NOT NULL,
  subcategory TEXT    NOT NULL,
  amount      REAL    NOT NULL,   -- always positive
  note        TEXT
);

-- Budgets: monthly planned amounts per subcategory
CREATE TABLE IF NOT EXISTS budgets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  fy_start    TEXT    NOT NULL,   -- "YYYY-MM" e.g. "2025-04"
  month       TEXT    NOT NULL,   -- "YYYY-MM" e.g. "2025-06"
  type        TEXT    NOT NULL,
  category    TEXT    NOT NULL,
  subcategory TEXT    NOT NULL,
  amount      REAL    NOT NULL DEFAULT 0,
  UNIQUE(fy_start, month, type, category, subcategory)
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_budgets_fy       ON budgets(fy_start, month);
```

All dates are stored as ISO 8601 strings (`YYYY-MM-DD`) so they sort correctly lexicographically. The `fy_start` column on `budgets` supports future multi-FY history without a schema change.

---

## API Reference

All endpoints prefixed with `/api`. All request and response bodies are JSON. No authentication required.

### Taxonomy

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/taxonomy` | Returns all taxonomy entries ordered by `sort_order` |
| POST | `/api/taxonomy` | Create a new subcategory entry |
| PUT | `/api/taxonomy/:id` | Rename category or subcategory; cascades to transactions + budgets |
| DELETE | `/api/taxonomy/:id` | Delete entry; blocked (400) if subcategory has transactions |
| PATCH | `/api/taxonomy/reorder` | Bulk update `sort_order` values |

**POST body:** `{ type, category, subcategory }`
**PUT body:** `{ category?, subcategory? }`
**PATCH body:** `[{ id, sort_order }, ...]`
**Response shape:** `{ id, type, category, subcategory, sort_order }`

**Delete rules:**
- Subcategory has transactions → **400** with human-readable message
- Subcategory has budgets but no transactions → deletes budgets then taxonomy row
- Nothing → deletes immediately

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions?month=YYYY-MM` | All transactions for the given month, ordered date DESC |
| POST | `/api/transactions` | Create a transaction |
| PUT | `/api/transactions/:id` | Update a transaction (partial fields accepted) |
| DELETE | `/api/transactions/:id` | Delete a transaction |

**POST body:** `{ date, type, category, subcategory, amount, note? }`
**Response shape:** `{ id, date, type, category, subcategory, amount, note }`

### Budgets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/budgets?fy_start=YYYY-MM` | All budget rows for the given FY |
| POST | `/api/budgets/bulk` | Upsert multiple budget rows (INSERT OR REPLACE) |

**POST body:** `{ fy_start, rows: [{ month, type, category, subcategory, amount }] }`
**Response:** `{ upserted: N }`

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/monthly?month=YYYY-MM` | Monthly summary KPIs + budget vs actual |
| GET | `/api/dashboard/yearly?fy_start=YYYY-MM` | All 12 months data + YTD totals + yearly budget vs actual |
| POST | `/api/reset` | Factory reset: supports FY-specific or full database reset |

**Reset request body:**
```json
// Reset only a specific FY (e.g., FY 2025-26)
{ "fy_start": "2025-04" }

// Reset entire database (all FYs + re-seed taxonomy)
{ "full": true }

// Empty body defaults to full reset (backward compatible)
{}
```

**Reset response:**
- FY reset: `{ "reset": true, "fyStart": "2025-04" }`
- Full reset: `{ "reset": true }`
```json
{
  "summary": { "income": 0, "expense": 0, "saving": 0, "net": 0 },
  "budgetVsActual": [
    { "type": "Expense", "category": "Personal", "subcategory": "Dining",
      "budget": 2000, "actual": 1500, "variance": -500, "pctUsed": 0.75 }
  ]
}
```

**Yearly response:**
```json
{
  "months": [
    { "month": "2025-04", "income_actual": 0, "expense_actual": 0, "saving_actual": 0,
      "income_budget": 0, "expense_budget": 0, "saving_budget": 0 }
  ],
  "ytd": { "income": 0, "expense": 0, "saving": 0, "net": 0 },
  "budgetVsActual": [ ... ]
}
```

**Projection** (Actuals + Budget for future months) is computed on the frontend in `calcUtils.js`, not pre-calculated by the server.

**Reset response:**
- FY reset: `{ "reset": true, "fyStart": "2025-04" }`
- Full reset: `{ "reset": true }`
- Error: `{ "error": "..." }` with HTTP 500

### Import

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/import` | Import transactions and budgets from an Excel (.xlsx) file |

**Request:** `multipart/form-data` with a `file` field containing an Excel file (max 5MB).

**Excel file format:**
| Column | Header | Description |
|--------|---------|-------------|
| A | Date | Transaction date (supports ISO, DD/MM/YYYY, Excel serial, MM/DD/YYYY, D-MMM-YY) |
| B | Month | Budget month (supports MMM-YY, YYYY-MM, "Month YYYY", MM/YYYY) |
| C | Remarks | Transaction note (optional) |
| D | Transaction Type | Must be "Income", "Expense", or "Saving" |
| E | Category | Transaction/budget category |
| F | Sub-Category | Transaction/budget subcategory |
| G | Actual Amount | Transaction amount (negative for Expense/Saving, positive for Income) |
| H | Budget Amount | Budget amount (optional) |

**Response:**
```json
{
  "transactions": { "inserted": 3, "skipped": 0 },
  "budgets": { "upserted": 2 },
  "errors": [
    { "row": 7, "reason": "Date could not be parsed: 'invalid'" }
  ]
}
```

- **Transactions:** Inserted records, skipped records (validation failures)
- **Budgets:** Upserted records (INSERT OR REPLACE)
- **Errors:** Array of `{ row, reason }` for rows that failed validation

**Notes:**
- Both transactions and budgets are imported from the same file in a single upload
- Budget imports are idempotent (re-importing overwrites existing values)
- Amount handling by type:
  - **Income**: Must be positive in Excel; negative income rows are skipped (data error)
  - **Expense/Saving**: Sign is flipped — Excel negative → DB positive (normal transaction), Excel positive → DB negative (reversal/withdrawal)
  - Zero amounts are skipped (meaningless)
- Invalid rows are skipped without aborting the entire import

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Validation error / business rule violation |
| 404 | Resource not found |
| 500 | Server error |

Error responses: `{ "error": "human-readable message" }`

---

## Frontend Pages

### Dashboard (`/`)

The primary read-only reporting screen for the current FY.

**Monthly View:**
- 4 KPI cards: Total Income / Expense / Saving / Net (colour-coded; Net green ≥0, red <0)
- Budget vs Actual table grouped by Type → Category → Subcategory with variance colour coding
- Spending Breakdown donut chart (toggle Income/Expense/Saving; click segment to drill into subcategories)
- All monetary values are drill-through clickable → navigates to Transactions page pre-filtered

**Yearly View:**
- Yearly Projection Card (actuals for elapsed months + budgets for future months)
- Annual KPI strip (Income/Expense/Saving/Net YTD + months elapsed/remaining)
- Month-by-Month grouped bar chart (12 bars, one per FY month)
- Net Balance trend line chart (line crosses zero reference; future months use budget-based projection)
- Annual Budget vs Actual rollup table
- Yearly drill-through opens a Month Picker modal before navigating

### Transactions (`/transactions`)

Primary data entry and management screen. Also the drill-through destination from Dashboard.

- **Entry Form** at top: Date (range-locked to current FY, max today), Type → Category → Subcategory cascade dropdowns, Amount, Note. Inline validation on submit.
- **Month Selector:** navigate any month within current FY
- **Filter Bar:** multi-select chips for Type / Category / Subcategory (cascading)
- **Sortable Table:** click any column header to sort ascending/descending
- **Edit:** pre-fills form; Cancel discards changes
- **Delete:** requires confirmation modal
- **Monthly Summary Strip:** Total Income / Expense / Saving / Net for the viewed month; updates reactively with filter changes
- When navigated from Dashboard via drill-through, month and filters are pre-applied

### Budget (`/budget`)

Set and manage monthly budgets at the subcategory level for the current FY.

- **Type tabs:** Income / Expense / Saving
- **12-month grid:** rows = Category (bold header, shows column sum) → Subcategory; columns = April through March
- **Inline cell editing:** click any cell to edit; Tab → next month; Enter → next row; Escape → cancel; auto-saves on blur
- **Seed month + Copy Forward:** designate a seed month, then copy its values across all other 11 months (with confirmation)
- **Row actions (⋯ menu):** Copy row across all months / Clear row (both with confirmation)
- **Toggles:** Show Actuals sub-row beneath each subcategory; Hide zero-budget rows

### Categories (`/categories`)

Manage the taxonomy of transaction types, categories, and subcategories.

- **Three-panel layout:** Transaction Types (fixed) | Categories | Subcategories
- **Add:** inline form at bottom of each panel; immediately available in all dropdowns
- **Rename:** inline edit; cascades to all existing transactions and budget records
- **Delete rules:**
  - Subcategory has transactions → blocked with count message
  - Subcategory has budgets only → warning confirmation, then deleted
  - Empty subcategory → confirmed then deleted
  - Category can only be deleted when all its subcategories are deletable
- **Reorder:** drag-and-drop ordering within each panel

### Settings (modal, accessible from nav)

- **Financial Year selector:** dropdown showing a rolling window of 4 FYs (e.g. FY 2023-24 through FY 2026-27). Switching FY instantly updates Dashboard, Transactions, and Budget pages.
- **Factory Reset:** clears all transactions, budgets, and taxonomy entries, then re-seeds the default 76-entry taxonomy. Requires confirmation via dialog. The page reloads after reset to refresh all in-memory state.

---

## Components

| Component | Lines | Responsibility |
|-----------|-------|----------------|
| `BudgetGrid.jsx` | 197 | Inline-editable 12-month spreadsheet-style grid with row/column action menus |
| `BudgetVsActualTable.jsx` | 67 | Reusable Budget vs Actual comparison table used in both monthly and yearly dashboard views |
| `ConfirmDialog.jsx` | 17 | Modal confirmation dialog; cannot be dismissed by clicking outside — Confirm/Cancel buttons only |
| `FilterBar.jsx` | 56 | Multi-select pill filter for Type/Category/Subcategory with cascading logic |
| `ImportDialog.jsx` | 221 | Modal dialog for importing transactions and budgets from Excel files; displays upload progress and results summary |
| `KPICard.jsx` | 11 | Single metric display card with optional click handler for drill-through |
| `MonthPicker.jsx` | 25 | 12-button month grid modal for yearly drill-through navigation |
| `ProjectionCard.jsx` | 43 | Yearly projection display: actuals + budgeted remaining = projected year-end; missing budget warning |
| `TransactionForm.jsx` | 122 | Controlled create/edit form with validation; date range-locked to current FY |
| `TransactionList.jsx` | 83 | Sortable table with inline Edit/Delete actions and confirmation on delete |

---

## Contexts

All contexts export a `Provider` component and a custom hook. No direct `useContext` calls are made outside context files.

| Context | Hook | Purpose |
|---------|------|---------|
| `TaxonomyContext.jsx` | `useTaxonomy()` | Global taxonomy state loaded once on app start; provides `getCategories(type)` and `getSubcategories(type, category)` selectors |
| `TransactionContext.jsx` | `useTransactionContext()` | Holds transaction list state for the Transactions page |
| `BudgetContext.jsx` | `useBudgetContext()` | Holds budget list state for the Budget page |

---

## Hooks

All `fetch()` calls live exclusively in hook files. Pages call hooks; components never call fetch.

| Hook | Returns | Purpose |
|------|---------|---------|
| `useDashboard(view, month, fyStart)` | `{ data, loading, error }` | Fetches monthly or yearly dashboard data |
| `useBudget(fyStart)` | `{ data, loading, error, saveBulk }` | Fetches budgets and exposes bulk upsert action |
| `useTransactions(month)` | `{ data, loading, error, reload, createTransaction, updateTransaction, deleteTransaction }` | Fetches transactions and exposes CRUD actions |
| `useReset()` | `{ reset(options), resetting, resetError }` | Calls `POST /api/reset` with optional `{ fyStart }` or `{ fullReset: true }`; re-throws on error |
| `useTaxonomy()` | (from TaxonomyContext) | Re-exported from context for consistent import path |
| `useTaxonomyActions()` | `{ createEntry, updateEntry, deleteEntry, reorderEntries }` | Taxonomy write operations (called from Categories page) |

---

## Utilities

Pure functions only — no API calls, no state reads, no side effects.

### `dateUtils.js`

| Function | Description |
|----------|-------------|
| `todayISO()` | Returns today as `YYYY-MM-DD` |
| `currentMonth()` | Returns current month as `YYYY-MM` |
| `getFYStart(startMonth)` | Returns current FY start as `YYYY-MM` given a 1-based start month |
| `getFYMonths(fyStart)` | Returns array of 12 `YYYY-MM` strings for the FY |
| `getFYList(startMonth, yearsBack, yearsForward)` | Returns selectable FY list; default window = 2 years back + 1 year forward relative to current FY |
| `getMonthLabel(yyyyMM)` | Returns human label e.g. `"Apr 2025"` |
| `getFYLabel(fyStart)` | Returns FY label e.g. `"FY 2025-26"` |
| `isElapsed(yyyyMM)` | True if month is before the current month |
| `isCurrent(yyyyMM)` | True if month equals the current month |
| `isFuture(yyyyMM)` | True if month is after the current month |

### `formatUtils.js`

| Function | Description |
|----------|-------------|
| `formatINR(amount)` | Formats a number as Indian Rupee currency string |
| `formatPct(value)` | Formats a decimal ratio as percentage string (e.g. `0.75` → `"75.0%"`) |
| `truncateNote(note, max)` | Truncates a string to max characters with ellipsis (default 100) |

### `calcUtils.js`

| Function | Description |
|----------|-------------|
| `calcNet(income, expense, saving)` | Returns `income - expense - saving` |
| `calcVariance(actual, budget)` | Returns `actual - budget` or null if no budget |
| `calcPctUsed(actual, budget)` | Returns `actual / budget` or null if no budget |
| `calcProjection(monthData)` | Sums actuals for elapsed/current months and budgets for future months; returns `{ income, expense, saving, balance, futureMissingBudget }` |

---

## Seed Data

On first run, `server/seed.js` populates the `taxonomy` table with 76 default entries across 23 categories:

**Income (6 categories):** Salary, Credit, Cashback, Rent, Misc, Cash

**Expense (14 categories):** Loan EMI, Rent, Personal, Entertainment, Utility, Automobiles, Home Expense, Education, Learning, Travel, Insurance, Taxes, Cashback, Exception

**Saving (3 categories):** Emergency Fund, Equity, Retirement

Seeding is idempotent — it only runs when the taxonomy table is empty.

---

## Configuration

### Environment Variables

**Local development** — read from `.env` at project root:

```
PORT=3001
DB_PATH=./finance.db
```

**Docker** — set in `docker-compose.yml` `environment:` block (`.env` is excluded from the image by `.dockerignore`):

```
NODE_ENV=production
PORT=3001
DB_PATH=/data/finance.db
```

`DB_PATH` accepts both relative paths (local dev) and absolute paths (Docker volume). The SQLite database file is created automatically on first run and seeded with 76 default taxonomy entries.

### Tailwind Colour Tokens

Defined in `client/vite.config.js` under `theme.extend.colors`:

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#1B3A6B` | Navy — headings, nav bar, banners |
| `accent` | `#2E75B6` | Blue — links, active states, borders |
| `positive` | `#1A6B3A` | Green — surplus, under-budget |
| `negative` | `#B03030` | Red — deficit, over-budget, delete actions |
| `warning` | `#856404` | Amber — informational warnings |
| `income` | `#2E75B6` | Chart colour for income |
| `expense` | `#B03030` | Chart colour for expense |
| `saving` | `#1A6B3A` | Chart colour for saving |

### Client Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Dashboard | Monthly/yearly reporting |
| `/transactions` | Transactions | Entry + list + filters |
| `/budget` | Budget | 12-month budget grid |
| `/categories` | Categories | Taxonomy management |

---

## File Line Limits

Enforced per the technology specification (limits increased by 20% to accommodate multi-year FY and factory reset features):

| File | Limit | Current |
|------|-------|---------|
| `server/server.js` | 360 | ~110 |
| `server/db.js` | 300 | ~224 |
| `pages/Dashboard.jsx` | 420 | ~165 |
| `pages/Budget.jsx` | 420 | ~140 |
| `pages/Transactions.jsx` | 420 | ~119 |
| `pages/Categories.jsx` | 420 | ~211 |
| `context/TaxonomyContext.jsx` | 200 | 52 |
| `context/TransactionContext.jsx` | 200 | 37 |
| `context/BudgetContext.jsx` | 200 | 36 |
| `components/BudgetGrid.jsx` | 150 | 197* |
| All other components | 150 | ≤122 |

*`BudgetGrid.jsx` slightly exceeds the 150-line component limit due to the complexity of inline editing keyboard navigation and row/column action menus.

---

## Known Constraints

- **No TypeScript** — all files use `.js` or `.jsx` only
- **No UI component libraries** — all UI is hand-built with Tailwind utility classes
- **No ORM** — raw SQL only, all queries contained in `server/db.js`
- **No test files** — no `.test.js`, `.spec.js`, or test framework configuration
- **Single FY view** — all screens scope to one selected FY at a time; multi-FY comparison not supported
- **No export functionality** — data export not implemented in this version
- **No authentication** — designed for single-user local/private deployment
- **Node 25 compatibility** — requires `better-sqlite3` v11+ (v9 does not compile against Node 25 headers which require C++20)
