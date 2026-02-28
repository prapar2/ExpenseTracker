import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTransactions } from '../hooks/useTransactions';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList';
import FilterBar from '../components/FilterBar';
import { formatINR } from '../utils/formatUtils';
import { currentMonth, getFYMonths, getMonthLabel } from '../utils/dateUtils';

export default function Transactions({ fyStart }) {
  const location = useLocation();
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Record Transactions</h1>
        <p className="text-sm text-gray-500 mt-1">Add and manage your financial transactions</p>
      </div>

      {/* Entry / Edit Form - Modern Card */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {editingTx ? 'Edit Transaction' : 'New Transaction'}
        </h2>
        <TransactionForm 
          initial={editingTx} 
          onSave={handleSave} 
          onCancel={() => setEditingTx(null)} 
          fyStart={fyStart} 
        />
        {editingTx && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <button 
              onClick={() => setEditingTx(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Cancel editing
            </button>
          </div>
        )}
      </div>

      {/* Month selector & Filters */}
      <div className="card p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          {/* Month Selector */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Month:</label>
            <select 
              value={month} 
              onChange={e => setMonth(e.target.value)} 
              className="select w-auto"
            >
              {fyMonths.map(m => (
                <option key={m} value={m}>{getMonthLabel(m)}</option>
              ))}
            </select>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {getMonthLabel(month)}
            </span>
          </div>
          
          {/* Transaction Count */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</span>
            {filters.types.length > 0 || filters.categories.length > 0 || filters.subcategories.length > 0 ? (
              <button 
                onClick={() => setFilters({ types: [], categories: [], subcategories: [] })}
                className="text-blue-600 hover:underline"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </div>

        {/* Filters */}
        <FilterBar filters={filters} onChange={setFilters} />
      </div>

      {/* Transaction list */}
      {error && (
        <div className="bg-red-100 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      
      {loading ? (
        <div className="card p-12 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Loading transactions...</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <TransactionList
            transactions={filtered}
            onEdit={setEditingTx}
            onDelete={deleteTransaction}
          />
        </div>
      )}

      {/* Monthly Summary Strip - Modern Card */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Summary</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-xs text-blue-700 font-medium mb-1">Total Income</p>
            <p className="text-xl font-bold text-blue-600">{formatINR(summary.income)}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-xs text-red-700 font-medium mb-1">Total Expense</p>
            <p className="text-xl font-bold text-red-600">{formatINR(summary.expense)}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-xs text-green-700 font-medium mb-1">Total Saving</p>
            <p className="text-xl font-bold text-green-600">{formatINR(summary.saving)}</p>
          </div>
          <div className={`rounded-lg p-4 ${summary.net >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className={`text-xs font-medium mb-1 ${summary.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>Net</p>
            <p className={`text-xl font-bold ${summary.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatINR(summary.net)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
