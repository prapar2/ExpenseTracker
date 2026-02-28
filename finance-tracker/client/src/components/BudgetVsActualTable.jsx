import { useState, useEffect } from 'react';
import { formatINR, formatPct } from '../utils/formatUtils';

// Session storage key
const STORAGE_KEY = 'dashboard_budget_table_expanded';

function getStoredExpandedState() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function storeExpandedState(state) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore
  }
}

const TYPES = ['Income', 'Expense', 'Saving'];

export default function BudgetVsActualTable({ rows, onDrillActual, onDrillProjected }) {
  const [explicitlyCollapsed, setExplicitlyCollapsed] = useState(() => getStoredExpandedState());

  useEffect(() => {
    storeExpandedState(explicitlyCollapsed);
  }, [explicitlyCollapsed]);

  if (!rows || rows.length === 0) return <p className="text-center text-gray-400 py-6">No data for this period.</p>;

  const grouped = {};
  for (const r of rows) {
    if (!grouped[r.type]) grouped[r.type] = {};
    if (!grouped[r.type][r.category]) grouped[r.type][r.category] = [];
    grouped[r.type][r.category].push(r);
  }

  // Get all unique type-category combinations
  const allKeys = [];
  TYPES.forEach(type => {
    if (grouped[type]) {
      Object.keys(grouped[type]).forEach(cat => {
        allKeys.push(`${type}|${cat}`);
      });
    }
  });

  function isExpanded(type, category) {
    const key = `${type}|${category}`;
    return explicitlyCollapsed[key] !== false;
  }

  function toggleItem(type, category) {
    const key = `${type}|${category}`;
    setExplicitlyCollapsed(prev => ({
      ...prev,
      [key]: !isExpanded(type, category)
    }));
  }

  function expandAll() {
    const allExpanded = {};
    allKeys.forEach(key => { allExpanded[key] = true; });
    setExplicitlyCollapsed(allExpanded);
  }

  function collapseAll() {
    const allCollapsed = {};
    allKeys.forEach(key => { allCollapsed[key] = false; });
    setExplicitlyCollapsed(allCollapsed);
  }

  const allExpanded = allKeys.length > 0 && allKeys.every(key => explicitlyCollapsed[key] !== false);
  const allCollapsed = allKeys.length > 0 && allKeys.every(key => explicitlyCollapsed[key] === false);

  function varClass(variance, type) {
    if (variance == null) return 'text-gray-400';
    if (type === 'Income') return variance >= 0 ? 'text-green-600' : 'text-yellow-600';
    return variance <= 0 ? 'text-green-600' : 'text-red-600';
  }

  // Build unique type list that exists in data
  const existingTypes = TYPES.filter(t => grouped[t]);

  return (
    <div>
      {/* Expand/Collapse Controls */}
      {allKeys.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b">
          <span className="text-xs text-gray-500 mr-2">Quick actions:</span>
          <button 
            onClick={expandAll} 
            disabled={allExpanded}
            className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${allExpanded ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50'}`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            Expand All
          </button>
          <span className="text-gray-300">|</span>
          <button 
            onClick={collapseAll} 
            disabled={allCollapsed}
            className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${allCollapsed ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v4h4m-4-4l5-5m0 0h4m-4 0l5 5m-5-5v4m4-4H8m4 4l-5 5m0 0h4m-4 0l5-5" />
            </svg>
            Collapse All
          </button>
          <span className="text-xs text-gray-400 ml-auto">
            {allKeys.filter(key => explicitlyCollapsed[key] !== false).length} of {allKeys.length} sections expanded
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Category / Subcategory</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Budget</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Actual</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Variance</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">% Used</th>
            </tr>
          </thead>
          <tbody>
            {existingTypes.map(type =>
              Object.entries(grouped[type]).map(([cat, catRows]) => {
                const isItemExpanded = isExpanded(type, cat);
                const catActual = catRows.reduce((s, r) => s + r.actual, 0);
                const catBudget = catRows.every(r => r.budget !== null) ? catRows.reduce((s, r) => s + (r.budget || 0), 0) : null;
                
                return [
                  <tr key={`cat-${type}-${cat}`} className="bg-gray-100">
                    <td className="px-3 py-2 font-bold text-gray-800">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleItem(type, cat)}
                          className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 transition-colors"
                          title={isItemExpanded ? 'Collapse' : 'Expand'}
                        >
                          <svg 
                            className={`w-3 h-3 text-gray-600 transition-transform ${isItemExpanded ? 'rotate-90' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <span className="text-xs text-gray-500 mr-1">{type}</span>
                        <span>{cat}</span>
                        <span className="text-xs text-gray-400 font-normal">
                          ({catRows.length} {catRows.length === 1 ? 'item' : 'items'})
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">{catBudget != null ? formatINR(catBudget) : '—'}</td>
                    <td className="px-3 py-2 text-right font-semibold">
                      <button onClick={() => onDrillActual(type, cat, null)} className="hover:underline text-blue-600 font-semibold">{formatINR(catActual)}</button>
                    </td>
                    <td colSpan={2}></td>
                  </tr>,
                  ...(isItemExpanded ? catRows.map(r => (
                    <tr key={`${type}-${cat}-${r.subcategory}`} className="hover:bg-gray-50 border-b">
                      <td className="px-3 py-2 pl-12 text-gray-700">{r.subcategory}</td>
                      <td className="px-3 py-2 text-right">{r.budget != null ? formatINR(r.budget) : '—'}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => onDrillActual(type, cat, r.subcategory)} className="hover:underline text-blue-600">{formatINR(r.actual)}</button>
                      </td>
                      <td className={`px-3 py-2 text-right ${varClass(r.variance, type)}`}>{r.variance != null ? formatINR(r.variance) : '—'}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{formatPct(r.pctUsed)}</td>
                    </tr>
                  )) : []),
                ];
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
