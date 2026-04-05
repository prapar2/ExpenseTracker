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

  // Get all unique type-category combinations and types
  const allTypeKeys = [];
  const allCatKeys = [];
  TYPES.forEach(type => {
    if (grouped[type]) {
      allTypeKeys.push(type);
      Object.keys(grouped[type]).forEach(cat => {
        allCatKeys.push(`${type}|${cat}`);
      });
    }
  });

  function isTypeExpanded(type) {
    const key = `type|${type}`;
    return explicitlyCollapsed[key] !== false;
  }

  function toggleType(type) {
    const key = `type|${type}`;
    setExplicitlyCollapsed(prev => ({
      ...prev,
      [key]: !isTypeExpanded(type)
    }));
  }

  function isCategoryExpanded(type, category) {
    const key = `${type}|${category}`;
    return explicitlyCollapsed[key] !== false;
  }

  function toggleCategory(type, category) {
    const key = `${type}|${category}`;
    setExplicitlyCollapsed(prev => ({
      ...prev,
      [key]: !isCategoryExpanded(type, category)
    }));
  }

  function expandAll() {
    const allExpanded = {};
    allTypeKeys.forEach(type => { allExpanded[`type|${type}`] = true; });
    allCatKeys.forEach(key => { allExpanded[key] = true; });
    setExplicitlyCollapsed(allExpanded);
  }

  function collapseAll() {
    const allCollapsed = {};
    allTypeKeys.forEach(type => { allCollapsed[`type|${type}`] = false; });
    allCatKeys.forEach(key => { allCollapsed[key] = false; });
    setExplicitlyCollapsed(allCollapsed);
  }

  const allExpanded = allTypeKeys.length > 0 && 
    allTypeKeys.every(t => isTypeExpanded(t)) && 
    allCatKeys.every(key => isCategoryExpanded(key.split('|')[0], key.split('|')[1]));
  const allCollapsed = allTypeKeys.length > 0 && 
    allTypeKeys.every(t => !isTypeExpanded(t)) && 
    allCatKeys.every(key => !isCategoryExpanded(key.split('|')[0], key.split('|')[1]));

  function varClass(variance, type) {
    if (variance == null) return 'text-gray-400';
    if (type === 'Income' || type === 'Saving') {
      return variance >= 0 ? 'text-green-600' : 'text-red-600';
    }
    // Expense: green when spent less (variance <= 0), red when overspent
    return variance <= 0 ? 'text-green-600' : 'text-red-600';
  }

  // Build unique type list that exists in data
  const existingTypes = TYPES.filter(t => grouped[t]);

  return (
    <div>
      {/* Expand/Collapse Controls */}
      {allTypeKeys.length > 0 && (
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
            {allTypeKeys.filter(t => isTypeExpanded(t)).length} of {allTypeKeys.length} types expanded
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
            {existingTypes.map(type => {
              const isTypeExp = isTypeExpanded(type);
              const typeCategories = Object.entries(grouped[type]);
              const typeActual = typeCategories.reduce((sum, [_, catRows]) => sum + catRows.reduce((s, r) => s + r.actual, 0), 0);
              const typeBudget = typeCategories.reduce((sum, [_, catRows]) => sum + catRows.reduce((s, r) => s + (r.budget || 0), 0), 0);
              const typeAnyBudgeted = typeCategories.some(([_, catRows]) => catRows.some(r => r.budget !== null));
              const typeVariance = typeAnyBudgeted ? typeActual - typeBudget : null;
              const typePctUsed = typeAnyBudgeted && typeBudget > 0 ? typeActual / typeBudget : null;

              return [
                // Type header row (Level 1)
                <tr key={`type-${type}`} className="bg-blue-50">
                  <td className="px-3 py-3 font-bold text-gray-900">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleType(type)}
                        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 transition-colors"
                        title={isTypeExp ? 'Collapse' : 'Expand'}
                      >
                        <svg 
                          className={`w-4 h-4 text-gray-700 transition-transform ${isTypeExp ? 'rotate-90' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <span>{type}</span>
                      <span className="text-xs text-gray-500 font-normal">
                        ({typeCategories.length} {typeCategories.length === 1 ? 'category' : 'categories'})
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-gray-900">{typeAnyBudgeted ? formatINR(typeBudget) : '—'}</td>
                  <td className="px-3 py-3 text-right font-bold text-gray-900">
                    <button onClick={() => onDrillActual(type, null, null)} className="hover:underline text-blue-600 font-bold">{formatINR(typeActual)}</button>
                  </td>
                  <td className={`px-3 py-3 text-right font-bold ${varClass(typeVariance, type)}`}>{typeVariance != null ? formatINR(typeVariance) : '—'}</td>
                  <td className="px-3 py-3 text-right font-bold text-gray-700">{formatPct(typePctUsed)}</td>
                </tr>,

                // Category and subcategory rows (Level 2 & 3) — only if type is expanded
                ...(isTypeExp ? typeCategories.map(([cat, catRows]) => {
                  const isCatExp = isCategoryExpanded(type, cat);
                  const catActual = catRows.reduce((s, r) => s + r.actual, 0);
                  const catBudget = catRows.reduce((s, r) => s + (r.budget || 0), 0);
                  const catAnyBudgeted = catRows.some(r => r.budget !== null);
                  const catVariance = catAnyBudgeted ? catActual - catBudget : null;
                  const catPctUsed = catAnyBudgeted && catBudget > 0 ? catActual / catBudget : null;

                  return [
                    // Category header row (Level 2)
                    <tr key={`cat-${type}-${cat}`} className="bg-gray-100">
                      <td className="px-3 py-2 font-bold text-gray-800 pl-8">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleCategory(type, cat)}
                            className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 transition-colors"
                            title={isCatExp ? 'Collapse' : 'Expand'}
                          >
                            <svg 
                              className={`w-3 h-3 text-gray-600 transition-transform ${isCatExp ? 'rotate-90' : ''}`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          <span>{cat}</span>
                          <span className="text-xs text-gray-400 font-normal">
                            ({catRows.length} {catRows.length === 1 ? 'item' : 'items'})
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">{catAnyBudgeted ? formatINR(catBudget) : '—'}</td>
                      <td className="px-3 py-2 text-right font-semibold">
                        <button onClick={() => onDrillActual(type, cat, null)} className="hover:underline text-blue-600 font-semibold">{formatINR(catActual)}</button>
                      </td>
                      <td className={`px-3 py-2 text-right font-semibold ${varClass(catVariance, type)}`}>{catVariance != null ? formatINR(catVariance) : '—'}</td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-600">{formatPct(catPctUsed)}</td>
                    </tr>,

                    // Subcategory rows (Level 3) — only if category is expanded
                    ...(isCatExp ? catRows.map(r => (
                      <tr key={`${type}-${cat}-${r.subcategory}`} className="hover:bg-gray-50 border-b">
                        <td className="px-3 py-2 pl-16 text-gray-700">{r.subcategory}</td>
                        <td className="px-3 py-2 text-right">{r.budget != null ? formatINR(r.budget) : '—'}</td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => onDrillActual(type, cat, r.subcategory)} className="hover:underline text-blue-600">{formatINR(r.actual)}</button>
                        </td>
                        <td className={`px-3 py-2 text-right ${varClass(r.variance, type)}`}>{r.variance != null ? formatINR(r.variance) : '—'}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{formatPct(r.pctUsed)}</td>
                      </tr>
                    )) : []),
                  ];
                }) : []),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
