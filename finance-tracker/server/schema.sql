CREATE TABLE IF NOT EXISTS taxonomy (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT    NOT NULL,
  category    TEXT    NOT NULL,
  subcategory TEXT    NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  date        TEXT    NOT NULL,
  type        TEXT    NOT NULL,
  category    TEXT    NOT NULL,
  subcategory TEXT    NOT NULL,
  amount      REAL    NOT NULL,
  note        TEXT
);

CREATE TABLE IF NOT EXISTS budgets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  fy_start    TEXT    NOT NULL,
  month       TEXT    NOT NULL,
  type        TEXT    NOT NULL,
  category    TEXT    NOT NULL,
  subcategory TEXT    NOT NULL,
  amount      REAL    NOT NULL DEFAULT 0,
  UNIQUE(fy_start, month, type, category, subcategory)
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_budgets_fy       ON budgets(fy_start, month);
