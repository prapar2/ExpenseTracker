import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTransactions } from '../hooks/useTransactions';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList';
import FilterBar from '../components/FilterBar';
import { formatINR } from '../utils/formatUtils';
import { currentMonth, getFYStart, getFYMonths, getMonthLabel } from '../utils/dateUtils';

export default function Transactions({ fyStartMonth = 4 }) {
  const location = useLocation();
  const nav = useNavigate();
  const fyStart = getFYStart(fyStartMonth);
  const fyMonths = getFYMonths(fyStart);
  const initState = location.state || {};
  const [month, setMonth] = useState(initState.month || currentMonth());
  const [filters, setFilters] = useState({
    types: initState.types || [],
    categories: initState.categories || [],
    subcategories: initState.subcategories || [],
  });
  const [editingTx, setEditingTx] = useState(null);

  const { data, loading, error, reload, createTransaction, updateTransaction, deleteTransaction } = useTransactions(month);

  // Apply filters
  const filtered = useMemo(() => data.filter(tx => {
    if (filters.types.length > 0 && !filters.types.includes(tx.type)) return false;
    if (filters.categories.length > 0 && !filters.categories.includes(tx.category)) return false;
    if (filters.subcategories.length > 0 && !filters.subcategories.includes(tx.subcategory)) return false;
    return true;
  }), [data, filters]);

  // Monthly summary (applied on filtered)
  const summary = useMemo(() => {
    const s = { income: 0, expense: 0, saving: 0 };
    for (const tx of filtered) {
      if (tx.type === 'Income') s.income += tx.amount;
      else if (tx.type === 'Expense') s.expense += tx.amount;
      else if (tx.type === 'Saving') s.saving += tx.amount;
    }
    s.net = s.income - s.expense - s.saving;
    return s;
  }, [filtered]);

  async function handleSave(form) {
    if (editingTx) {
      await updateTransaction(editingTx.id, form);
      setEditingTx(null);
    } else {
      await createTransaction(form);
    }
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-primary mb-4">Record Transactions</h1>

      {/* Entry / Edit Form */}
      {editingTx ? (
        <div className="mb-4">
          <h2 className="text-base font-semibold mb-2">Edit Transaction</h2>
          <TransactionForm initial={editingTx} onSave={handleSave} onCancel={() => setEditingTx(null)} fyStartMonth={fyStartMonth} />
        </div>
      ) : (
        <div className="mb-4">
          <h2 className="text-base font-semibold mb-2">New Transaction</h2>
          <TransactionForm onSave={handleSave} fyStartMonth={fyStartMonth} />
        </div>
      )}

      {/* Month selector */}
      <div className="flex items-center gap-3 mb-3">
        <label className="text-sm font-medium text-gray-700">Month:</label>
        <select value={month} onChange={e => setMonth(e.target.value)} className="border rounded px-2 py-1 text-sm">
          {fyMonths.map(m => (
            <option key={m} value={m}>{getMonthLabel(m)}</option>
          ))}
        </select>
      </div>

      {/* Filters */}
      <div className="mb-3">
        <FilterBar filters={filters} onChange={setFilters} />
      </div>

      {/* Transaction list */}
      {error && <p className="text-negative text-sm mb-2">{error}</p>}
      {loading ? (
        <p className="text-center text-gray-400 py-8">Loading…</p>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden mb-4">
          <TransactionList
            transactions={filtered}
            onEdit={setEditingTx}
            onDelete={deleteTransaction}
          />
        </div>
      )}

      {/* Monthly Summary Strip */}
      <div className="bg-gray-50 border rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-gray-500">Total Income</p>
          <p className="font-bold text-income">{formatINR(summary.income)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Total Expense</p>
          <p className="font-bold text-expense">{formatINR(summary.expense)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Total Saving</p>
          <p className="font-bold text-saving">{formatINR(summary.saving)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Net</p>
          <p className={`font-bold ${summary.net >= 0 ? 'text-positive' : 'text-negative'}`}>{formatINR(summary.net)}</p>
        </div>
      </div>
    </div>
  );
}
