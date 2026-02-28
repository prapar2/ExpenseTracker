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

  return (
    <div className="p-4 max-w-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-primary">Budget</h1>
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={showActuals} onChange={e => setShowActuals(e.target.checked)} className="rounded" />
            Show Actuals
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={hideZero} onChange={e => setHideZero(e.target.checked)} className="rounded" />
            Hide zero rows
          </label>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex border-b mb-4">
        {TYPES.map(t => (
          <button key={t} onClick={() => setActiveType(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeType === t ? 'border-accent text-accent' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Seed month + Copy forward */}
      <div className="flex items-center gap-4 mb-4 bg-gray-50 border rounded p-3 text-sm">
        <div className="flex items-center gap-2">
          <label className="text-gray-700 font-medium">Seed month:</label>
          <select value={seedMonth} onChange={e => setSeedMonth(e.target.value)} className="border rounded px-2 py-1 text-sm">
            {months.map(m => <option key={m} value={m}>{getMonthLabel(m)}</option>)}
          </select>
        </div>
        <button
          onClick={() => setConfirm({ type: 'copyForward' })}
          className="px-3 py-1 bg-accent text-white rounded hover:opacity-90 text-sm">
          Copy {getMonthLabel(seedMonth)} → All Months
        </button>
      </div>

      {error && <p className="text-negative text-sm mb-2">{error}</p>}
      {loading ? (
        <p className="text-center text-gray-400 py-8">Loading budgets…</p>
      ) : (
        <BudgetGrid
          type={activeType}
          months={months}
          taxonomy={visibleTaxonomy}
          budgetMap={budgetMap}
          actuals={actualsMap}
          showActuals={showActuals}
          onSave={saveBulk}
        />
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
