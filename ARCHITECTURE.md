# Personal Finance Tracker - Architecture & Design Guide

> Comprehensive guide to the codebase structure, design decisions, and data flow.
> See [README.md](./finance-tracker/README.md) for quick start and API reference.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Database Design](#database-design)
5. [Frontend Architecture](#frontend-architecture)
6. [Backend Architecture](#backend-architecture)
7. [State Management](#state-management)
8. [Data Flow](#data-flow)
9. [Key Design Decisions](#key-design-decisions)
10. [Development Workflow](#development-workflow)

---

## Project Overview

**Personal Finance Tracker** is a single-user web application for tracking income, expenses, and savings with budgeting and financial dashboards. The application is scoped to a Financial Year (FY: April–March by default) and tracks all amounts in Indian Rupees (₹).

### Core Features

- ✅ Multi-month FY tracking with fiscal year selector
- ✅ Budget vs Actual analysis for expense management
- ✅ Year-end savings projection and forecasting
- ✅ Hierarchical category taxonomy with three transaction types (Income/Expense/Saving)
- ✅ Dashboard with KPIs, charts, and drill-through capability
- ✅ Import/Export via Excel files
- ✅ Full or FY-specific data reset
- ✅ Home Assistant integration (add-on mode support)
- ✅ Docker containerization with data persistence

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.x | Component-based UI framework (JSX only, no TypeScript) |
| Vite | 5.x | Fast development build tool and dev server with HMR |
| Tailwind CSS | 3.x | Utility-first CSS framework |
| React Router | 6.x | Client-side routing (HTML5 history, no hash) |
| Recharts | 2.x | React charting library (Bar, Line, Pie charts) |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | LTS (≥20) | JavaScript runtime |
| Express | 4.x | Web application framework |
| better-sqlite3 | 11.x | Synchronous SQLite driver |
| dotenv | 17.x | Environment variable management |
| multer | Latest | File upload handling (for Excel import) |

### Database

- **SQLite** — Single-file database ideal for a single-user application
- **Schema versioning** — Not used (schema is immutable for this application)
- **Migrations** — Not needed; schema created on app startup

### Build & Deployment

- **Docker** — Multi-stage build (builder + runner)
- **docker-compose** — Service orchestration with named volume for data persistence
- **npm workspaces** — Not used; root + client are separate package.json files

---

## System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    User Browser                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │         React SPA (Vite built)                    │  │
│  │  • Dashboard, Transactions, Budget, Categories   │  │
│  │  • Context providers: Taxonomy, Transactions,    │  │
│  │    Budgets                                       │  │
│  └────────────────────────────────────────────────────┘  │
│                        ↓ HTTP/JSON                       │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│               Express Server (Node.js)                    │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Routes (with /app-api prefix)                    │  │
│  │  • /taxonomy — CRUD + reorder                     │  │
│  │  • /transactions — CRUD by month                  │  │
│  │  • /budgets — GET by FY, bulk upsert              │  │
│  │  • /dashboard — monthly/yearly aggregates         │  │
│  │  • /import, /export — file I/O                    │  │
│  │  • /reset — factory reset operations              │  │
│  └────────────────────────────────────────────────────┘  │
│                        ↓ SQL                              │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Database Layer (db.js, better-sqlite3)          │  │
│  │  • CRUD functions for all tables                  │  │
│  │  • Cascading updates on taxonomy changes          │  │
│  │  • Aggregation queries for dashboard              │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│              SQLite Database File                        │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Tables:                                           │  │
│  │  • taxonomy (76 default entries)                  │  │
│  │  • transactions (user-created records)            │  │
│  │  • budgets (monthly allocations by subcategory)   │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## Database Design

### Schema Overview

```sql
-- Hierarchical taxonomy of transaction categories
CREATE TABLE taxonomy (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT NOT NULL,           -- "Income" | "Expense" | "Saving"
  category    TEXT NOT NULL,           -- e.g. "Personal", "Investment"
  subcategory TEXT NOT NULL,           -- e.g. "Dining", "FD Interest"
  sort_order  INTEGER NOT NULL DEFAULT 0
  -- 76 default entries pre-seeded on app startup
);

-- Individual financial transactions
CREATE TABLE transactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  date        TEXT NOT NULL,           -- ISO 8601: YYYY-MM-DD
  type        TEXT NOT NULL,           -- "Income" | "Expense" | "Saving"
  category    TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  amount      REAL NOT NULL,           -- Always positive
  note        TEXT
  -- Indexed on date and type for fast filtering
);

-- Monthly budget allocations
CREATE TABLE budgets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  fy_start    TEXT NOT NULL,           -- "YYYY-MM", e.g. "2025-04"
  month       TEXT NOT NULL,           -- "YYYY-MM", e.g. "2025-06"
  type        TEXT NOT NULL,
  category    TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  amount      REAL NOT NULL DEFAULT 0,
  UNIQUE(fy_start, month, type, category, subcategory)
  -- Enables INSERT OR REPLACE for idempotent upserts
);

-- Indexes for query performance
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_budgets_fy ON budgets(fy_start, month);
```

### Design Rationale

**Denormalized Structure:**
- No foreign keys. Category names are stored as plain strings in transactions and budgets.
- Renames cascade via SQL UPDATE statements (`UPDATE ... WHERE old_value`).
- Eliminates join complexity for common queries.

**String-based Dates:**
- All dates stored as ISO 8601 strings (YYYY-MM-DD) for lexicographic sorting.
- No timezone handling needed (single-user, single timezone).

**UNIQUE Constraint on Budgets:**
- Enables `INSERT OR REPLACE` for idempotent bulk upserts.
- Prevents duplicate budget entries per (FY, month, category, subcategory) tuple.

**Default Seed Data:**
- 76 taxonomy entries (default categories) loaded via `seed.js` on first app startup.
- Users can add, rename, or delete categories in the UI.

---

## Frontend Architecture

### Directory Structure

```
client/src/
├── main.jsx                 # ReactDOM bootstrap
├── App.jsx                  # Root component, routing, settings modal
├── index.css                # Tailwind directives
│
├── pages/                   # Route destinations
│   ├── Dashboard.jsx        # (164 lines) Monthly/yearly reporting with charts
│   ├── Transactions.jsx     # (122 lines) Transaction CRUD + filtering
│   ├── Budget.jsx           # (143 lines) 12-month budget grid editor
│   └── Categories.jsx       # (211 lines) Taxonomy management (3-panel layout)
│
├── components/              # Reusable UI components
│   ├── BudgetGrid.jsx       # Spreadsheet-style inline-editable budget grid
│   ├── BudgetVsActualTable.jsx  # Budget vs actual comparison
│   ├── ConfirmDialog.jsx    # Modal confirmation dialog
│   ├── FilterBar.jsx        # Multi-select filter pills
│   ├── ImportDialog.jsx     # Excel import modal
│   ├── KPICard.jsx          # Single metric card
│   ├── MonthPicker.jsx      # 12-month picker modal
│   ├── ProjectionCard.jsx   # Year-end projection display
│   ├── TransactionForm.jsx  # Create/edit transaction form
│   └── TransactionList.jsx  # Sortable transaction table
│
├── context/                 # React Context providers
│   ├── TaxonomyContext.jsx  # Global category structure
│   ├── TransactionContext.jsx  # Transaction state holder
│   └── BudgetContext.jsx    # Budget state holder
│
├── hooks/                   # Custom React hooks
│   ├── useDashboard.js      # Fetch dashboard data (monthly/yearly)
│   ├── useBudget.js         # Fetch budgets + bulk upsert
│   ├── useReset.js          # Factory reset operation
│   ├── useTaxonomy.js       # Manage taxonomy + selectors
│   └── useTransactions.js   # Transaction CRUD operations
│
└── utils/                   # Utility functions
    ├── dateUtils.js         # FY calculations, month labels
    ├── formatUtils.js       # Currency formatting
    ├── calcUtils.js         # Financial calculations
    └── apiUtils.js          # API base URL constant
```

### Pages & Features

| Page | Route | Purpose | Key Features |
|------|-------|---------|--------------|
| **Dashboard** | `/` | Primary reporting screen | KPIs, budget vs actual table, donut spending breakdown, trend lines, drill-through to transactions |
| **Transactions** | `/transactions` | Data entry & management | CRUD form, month selector, advanced filtering (Type/Category/Subcategory), sortable table, edit/delete actions |
| **Budget** | `/budget` | Budget management | 12-month grid editor, seed+copy forward, row actions, inline editing, actuals toggle |
| **Categories** | `/categories` | Taxonomy management | 3-panel editor (Types/Categories/Subcategories), add/rename/delete with referential integrity checking, drag-drop reorder |

### State Management Pattern

**Three Context Providers (maximum):**

1. **TaxonomyContext** — Global, loaded once at app startup
   - Provides access to all category definitions
   - Shared across all pages

2. **TransactionContext** — Page-scoped (Transactions page)
   - Simple state holder: `{ transactions: [], loading, error }`
   - Loaded when Transactions page mounts

3. **BudgetContext** — Page-scoped (Budget page)
   - Simple state holder: `{ budgets: [], loading, error }`
   - Loaded when Budget page mounts

**Hooks own all fetch() calls:**
- Components never call fetch directly
- All API communication is encapsulated in hooks
- Hooks manage loading/error states

### Component Patterns

**Controlled Forms:**
- `TransactionForm` — Controlled inputs, validation on submit, optional pre-fill for edit mode

**Inline Editing:**
- `BudgetGrid` — Click-to-edit cells with Tab/Enter/Escape keyboard shortcuts

**Modal Dialogs:**
- `ConfirmDialog` — Cannot be dismissed by clicking outside (button-only dismissal)
- `ImportDialog` — File upload with progress display and results summary
- `MonthPicker` — 12-month grid selector

**Drill-through:**
- KPI cards, table cells, and chart segments are clickable
- Navigates to Transactions page with pre-applied filters

---

## Backend Architecture

### Express Server Structure

**File:** `server/server.js` (≤360 lines, organized by resource)

#### Route Organization

```javascript
// Taxonomy CRUD
GET    /app-api/taxonomy
POST   /app-api/taxonomy
PUT    /app-api/taxonomy/:id
DELETE /app-api/taxonomy/:id
PATCH  /app-api/taxonomy/reorder

// Transactions CRUD
GET    /app-api/transactions?month=YYYY-MM
POST   /app-api/transactions
PUT    /app-api/transactions/:id
DELETE /app-api/transactions/:id

// Budgets
GET    /app-api/budgets?fy_start=YYYY-MM
POST   /app-api/budgets/bulk

// Dashboard (read-only aggregation)
GET    /app-api/dashboard/monthly?month=YYYY-MM
GET    /app-api/dashboard/yearly?fy_start=YYYY-MM

// Data Operations
POST   /app-api/import (multipart/form-data with file)
GET    /app-api/export (returns binary Excel file)
POST   /app-api/reset  ({ fy_start?: string, full?: boolean })

// Static Files
GET    /    (serves index.html)
GET    /*   (serves client/dist files)
```

#### Middleware Stack

```javascript
express.json()          // Parse JSON request bodies
multer(memoryStorage)   // Handle file uploads (max 5MB)
```

#### Error Handling

- All errors return JSON: `{ error: "human-readable message" }`
- HTTP status codes:
  - 200: Success
  - 201: Created
  - 400: Validation/business logic error
  - 404: Resource not found
  - 500: Server error

### Database Layer

**File:** `server/db.js` (≤300 lines, organized by table)

#### Function Organization

```javascript
// Taxonomy functions
getTaxonomy()                    // SELECT * with sort order
createTaxonomy(data)            // INSERT new entry
updateTaxonomy(id, data)        // UPDATE with cascade
deleteTaxonomy(id)              // DELETE with referential checks
reorderTaxonomy(items)          // PATCH bulk sort_order

// Transaction functions
getTransactions(month)          // SELECT by month (or all)
createTransaction(data)         // INSERT
updateTransaction(id, data)     // UPDATE
deleteTransaction(id)           // DELETE

// Budget functions
getBudgets(fy_start)           // SELECT by FY
upsertBudgets(fy_start, rows)  // INSERT OR REPLACE bulk

// Dashboard aggregation
getDashboardMonthly(month)      // SELECT SUM by type/category
getDashboardYearly(fy_start)    // SELECT all 12 months by type

// Reset operations
resetDatabase(fy_start?)        // DELETE transactions/budgets by FY or full reset + re-seed
```

#### Key Implementation Details

**Synchronous API:**
- `better-sqlite3` uses synchronous execution (no async/await)
- Simpler to reason about; no Promise chains in db layer
- Sufficient for single-user, moderate data volumes

**Cascading Updates:**
```javascript
// When a category is renamed, cascade to transactions + budgets
UPDATE transactions SET category=? WHERE type=? AND category=?
UPDATE budgets SET category=? WHERE type=? AND category=?
```

**Transactions (ACID atomicity):**
```javascript
const runAll = db.transaction((rows) => {
  for (const r of rows) update.run(r.sort_order, r.id);
});
runAll(items);  // All-or-nothing execution
```

**Referential Integrity:**
```javascript
// Cannot delete subcategory if it has transactions
const txCount = db.prepare('SELECT COUNT(*) as c FROM transactions WHERE ...')
  .get(type, category, subcategory).c;
if (txCount > 0) return { error: '...', status: 400 };
```

### Import/Export

**File:** `server/import.js` (~362 lines)

- Parses `.xlsx` files using `ExcelJS` library
- Supports flexible date parsing (ISO, DD/MM/YYYY, Excel serial, etc.)
- Supports flexible month format (MMM-YY, YYYY-MM, Month YYYY, etc.)
- Validates transaction types and amounts (skips invalid rows)
- Returns detailed results: `{ transactions: { inserted, skipped }, budgets: { upserted }, errors: [...] }`

**File:** `server/export.js`

- Generates `.xlsx` file with transaction and budget data
- Returns binary buffer for download

---

## State Management

### Frontend State Flow

```
┌─────────────────────────────────────────────────────────────┐
│  App.jsx                                                    │
│  • fyStart (selected financial year)                        │
│  • settingsOpen, showImport, showExport                     │
│  • Wraps all pages with TaxonomyProvider                    │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│  TaxonomyContext (global, loaded once)                      │
│  • taxonomy state: { sorted entries, loading, error }       │
│  • Selectors: getCategories(type), getSubcats(type/cat)    │
└─────────────────────────────────────────────────────────────┘
         ↓ (used by all pages)
┌─────────────────────────────────────────────────────────────┐
│  Page-specific State (Context + Hooks)                      │
│                                                             │
│  Transactions Page:                                         │
│  • TransactionContext: { transactions[], loading, error }   │
│  • Local state: month, filters, editingTx                   │
│  • Hook: useTransactions(month)                             │
│                                                             │
│  Budget Page:                                               │
│  • BudgetContext: { budgets[], loading, error }             │
│  • Local state: selectedType                                │
│  • Hook: useBudget(fyStart)                                 │
│                                                             │
│  Dashboard Page:                                            │
│  • Local state: view (monthly/yearly), month, donutType     │
│  • Hook: useDashboard(view, month, fyStart)                 │
│                                                             │
│  Categories Page:                                           │
│  • Uses TaxonomyContext directly                            │
│  • Local state: selectedCategory, editing states            │
└─────────────────────────────────────────────────────────────┘
```

### Reducing Complexity

**Why 3 Contexts?**
- More than 3 creates prop-drilling nightmares
- Fewer than 3 would mix concerns
- TaxonomyContext is global; others are page-scoped

**Why useReducer?**
- Simple state machine for async fetch operations
- Actions: SET, SET_LOADING, SET_ERROR

---

## Data Flow

### User Action → Display Update (Example: Add Transaction)

```
User fills TransactionForm & clicks Submit
          ↓
TransactionForm.onSave() calls hook's createTransaction()
          ↓
Hook executes: POST /app-api/transactions (with form data)
          ↓
Express validates & calls db.createTransaction()
          ↓
SQLite INSERT returns new row ID
          ↓
Hook receives response, dispatches { type: 'SET', payload: [updated array] }
          ↓
TransactionContext state updates
          ↓
Transactions page re-renders with new transaction in list
```

### Financial Year Change Flow

```
User selects different FY in Settings modal
          ↓
App.jsx setState(fyStart)
          ↓
Dashboard, Transactions, Budget pages detect fyStart prop change
          ↓
Each hook re-runs its fetch() with new fyStart value
          ↓
useEffect dependencies: [view, month, fyStart] for useDashboard
          ↓
New data fetched from API
          ↓
All pages re-render with new FY data
          ↓
Transactions page resets selected month to first month of new FY
```

---

## Key Design Decisions

### 1. Financial Year Scoping

- All data is scoped to a single FY at a time
- Changing FY doesn't delete data; it only changes the viewing window
- FY start month is fixed at April (configurable via `FY_START_MONTH` in App.jsx)
- Multiple FYs can coexist in the database for historical analysis (future feature)

### 2. Denormalized Database

- **Pros:** Simple queries, no joins, cascading updates simple to implement
- **Cons:** Potential for data inconsistency if cascade logic fails
- **Mitigation:** Tests for cascade operations; UI prevents orphaning

### 3. Synchronous Database Layer

- **Pros:** Simpler code flow, no Promise chains, easier debugging
- **Cons:** Blocks event loop during large queries (acceptable for single-user app)
- **Decision:** Adequate for expected data volume (10K–100K transactions)

### 4. No Authentication

- **Assumption:** Single-user app, deployed on private network
- **For multi-user:** Add JWT or session-based auth to Express routes

### 5. Three Fixed Transaction Types

- **Income, Expense, Saving** — built-in types (not customizable)
- **Design rationale:** Simplifies dashboard logic; clear financial semantics
- **Sub-categorization:** Custom via taxonomy editor

### 6. Inline Tailwind in Vite Config

- **Problem:** Running `vite build client` from project root breaks Tailwind's glob resolver
- **Solution:** Inline PostCSS plugin in `vite.config.js` with absolute paths
- **Trade-off:** Slightly unconventional but necessary for this project structure

### 7. ESM/CJS Split

- **Frontend:** Uses ESM (`client/package.json` sets `"type": "module"`)
- **Backend:** Uses CommonJS (`server/server.js` uses `require()`)
- **Trade-off:** Dual module systems but each layer uses its natural idiom

### 8. Import/Export Features

- **Format:** Excel (.xlsx) for universal compatibility
- **Idempotency:** Re-importing overwrites existing budgets; transactions are always inserted (no de-duplication)
- **Error handling:** Invalid rows are skipped; process continues (fail-soft)

### 9. No ORM

- **Decision:** Raw SQL via `better-sqlite3` prepared statements
- **Rationale:** Tight control over query performance; database schema is simple
- **Risk:** SQL injection mitigated via prepared statement parameter binding

---

## Development Workflow

### Local Development

```bash
# Install dependencies
npm install

# Start both server (port 3001) and Vite client (port 5173) with HMR
npm run dev

# In browser: http://localhost:5173
# Database: ./finance.db (created on first run)
```

### Testing & Building

```bash
# Build client (outputs to client/dist/)
npm run build

# Run production build (serves both API and built client on port 3001)
npm start

# Docker build and run
docker compose up --build
```

### Code Organization Principles

1. **Small, focused files** — Max 250 lines per file for readability
2. **Hooks encapsulate fetch()** — Components never call fetch directly
3. **Contexts are thin** — Only hold state, selectors in hooks
4. **Utility functions pure** — No side effects (dateUtils, calcUtils, formatUtils)
5. **Components are dumb** — No business logic, only presentation
6. **Database layer synchronous** — No async/await in db.js

---

## Performance Considerations

### Frontend

- **Recharts:** Render budget vs actual table with <1000 records without virtualization
- **React Context:** Sufficient for state volume (3 contexts, each <10MB data)
- **Bundle size:** ~500KB uncompressed (React 18 + Recharts + Tailwind)

### Backend

- **SQLite:** Sufficient for single-user, <1M transactions
- **Indexes:** On (date, type) for fast filtering
- **Sync database:** Event loop blocking negligible for query execution time

### Database

- **WAL mode:** Enabled via `db.pragma('journal_mode = WAL')` for concurrent reads
- **No migrations:** Schema created fresh on each app startup (idempotent)

---

## Security Considerations

- **No authentication** — Deployed on private networks only
- **No HTTPS requirement** — HTTP acceptable for LAN/Docker
- **No input validation beyond basics** — Assume trusted user
- **SQL injection** — Prevented via prepared statements
- **CSRF** — Not applicable (single-user, no session state)

---

## Future Enhancements

1. **Multi-user support** — Add JWT auth, per-user data isolation
2. **Multi-FY queries** — Year-over-year comparison, historical trends
3. **Export formats** — PDF reports, CSV, charts as images
4. **Recurring transactions** — Templates for automatic entries
5. **Mobile app** — React Native or PWA
6. **Real-time sync** — WebSocket for live updates across devices
7. **Analytics** — Predictive budgeting, spending patterns, ML classification
