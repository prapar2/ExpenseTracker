# Personal Finance Tracker

A personal finance tracking application for managing income, expenses,
and savings across a financial year.

## Features
- Record daily transactions across Income, Expense, and Saving types
- Monthly budgeting with copy-forward across the financial year
- Dashboard with Budget vs Actual tracking and projections
- Excel import for bulk transaction and budget loading
- Manage custom categories and subcategories

## Data Storage
Your financial data is stored in a SQLite database at `/data/finance.db`
inside the add-on's persistent storage volume. This data is preserved
across add-on updates, restarts, and Home Assistant OS updates.

## First Run
On first start, the database is created automatically. No manual setup required.

## Access
Open the app using the **Open Web UI** button on this page, or via the
**Finance Tracker** entry in the Home Assistant sidebar.

## Updating
When a new version is available, click **Update** on this page. Your data
is never affected by updates.