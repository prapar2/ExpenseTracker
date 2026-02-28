import { useState, useMemo } from 'react';
import { useBudget } from '../hooks/useBudget';
import { useTransactions } from '../hooks/useTransactions';
import { useTaxonomy } from '../context/TaxonomyContext';
import BudgetGrid from '../components/BudgetGrid';
import ConfirmDialog from '../components/ConfirmDialog';
import { getFYMonths, getMonthLabel, currentMonth } from '../utils/dateUtils';

const TYPES = ['Income', 'Expense', 'Saving'];

export default function Budget({ fyStart }) {
  const months = getFYMonths(fyStart);
  const [activeType, setActiveType] = useState('Expense');
  const [seedMonth, setSeedMonth] = useState(currentMonth());
  const [showActuals, setShowActuals] = useState(false);
  const [hideZero, setHideZero] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const { data: budgets, loading, error, saveBulk, reload } = useBudget(fyStart);
  const { data: allTx } = useTransactions(null);
  const { items: taxonomy } = useTaxonomy();

  // Build budget map: type|category|subcategory|month -> amount
  const budgetMap = useMemo(() => {
    const m = {};
    for (const b of budgets) {
      m[`${b.type}|${b.category}|${b.subcategory}|${b.month}`] = b.amount;
    }
    return m;
  }, [budgets]);

  // Build actuals map for actuals sub-row
  const actualsMap = useMemo(() => {
    const m = {};
    for (const tx of allTx) {
      const mo = tx.date.slice(0, 7);
      const k = `${tx.type}|${tx.category}|${tx.subcategory}|${mo}`;
      m[k] = (m[k] || 0) + tx.amount;
    }
    return m;
  }, [allTx]);

  async function handleCopyForward() {
    // Get seed month values for active type
    const seedRows = budgets.filter(b => b.type === activeType && b.month === seedMonth);
    if (seedRows.length === 0) { alert('No budget values in seed month to copy.'); return; }
    const rowsToSave = [];
    for (const b of seedRows) {
      for (const m of months) {
        if (m !== seedMonth) rowsToSave.push({ month: m, type: b.type, category: b.category, subcategory: b.subcategory, amount: b.amount });
      }
    }
    await saveBulk(rowsToSave);
    setConfirm(null);
  }

  async function handleResetMonth(month) {
    const rows = budgets.filter(b => b.type === activeType && b.month === month);
    if (rows.length === 0) return;
    const resetRows = rows.map(b => ({ ...b, amount: 0 }));
    await saveBulk(resetRows);
    setConfirm(null);
  }

  // Filter taxonomy for active type, optionally hiding zero-budget rows
  const visibleTaxonomy = useMemo(() => {
    if (!hideZero) return taxonomy;
    return taxonomy.filter(t => {
      if (t.type !== activeType) return true;
      return months.some(m => {
        const v = budgetMap[`${t.type}|${t.category}|${t.subcategory}|${m}`];
        return v != null && v > 0;
      });
    });
  }, [taxonomy, hideZero, budgetMap, activeType, months]);

  const typeColors = {
    Income: { border: 'border-blue-500', text: 'text-blue-600' },
    Expense: { border: 'border-red-500', text: 'text-red-600' },
    Saving: { border: 'border-green-500', text: 'text-green-600' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget</h1>
          <p className="text-sm text-gray-500 mt-1">Set and manage monthly budgets for your financial goals</p>
        </div>
        
        {/* Options */}
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={showActuals} 
              onChange={e => setShowActuals(e.target.checked)} 
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-600">Show Actuals</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={hideZero} 
              onChange={e => setHideZero(e.target.checked)} 
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-600">Hide zero rows</span>
          </label>
        </div>
      </div>

      {/* Type tabs - Modern */}
      <div className="flex border-b border-gray-200">
        {TYPES.map(t => (
          <button 
            key={t} 
            onClick={() => setActiveType(t)}
            className={`px-6 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeType === t 
                ? `${typeColors[t].border} ${typeColors[t].text}`
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Seed month + Copy forward - Modern Card */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Seed month:</label>
            <select 
              value={seedMonth} 
              onChange={e => setSeedMonth(e.target.value)} 
              className="select w-auto"
            >
              {months.map(m => <option key={m} value={m}>{getMonthLabel(m)}</option>)}
            </select>
          </div>
          <button
            onClick={() => setConfirm({ type: 'copyForward' })}
            className="btn-accent text-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy {getMonthLabel(seedMonth)} → All Months
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-100 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="card p-12 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Loading budgets...</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <BudgetGrid
            type={activeType}
            months={months}
            taxonomy={visibleTaxonomy}
            budgetMap={budgetMap}
            actuals={actualsMap}
            showActuals={showActuals}
            onSave={saveBulk}
          />
        </div>
      )}

      {confirm?.type === 'copyForward' && (
        <ConfirmDialog
          message={`Copy all ${activeType} budgets from ${getMonthLabel(seedMonth)} to all other 11 months? Existing values will be overwritten.`}
          onConfirm={handleCopyForward}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
