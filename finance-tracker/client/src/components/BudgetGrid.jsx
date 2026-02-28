import { useState, useRef } from 'react';
import { formatINR, formatPct } from '../utils/formatUtils';
import { getMonthLabel } from '../utils/dateUtils';
import ConfirmDialog from './ConfirmDialog';

export default function BudgetGrid({ type, months, taxonomy, budgetMap, actuals, showActuals, onSave }) {
  const [editing, setEditing] = useState(null); // { row key, month }
  const [editVal, setEditVal] = useState('');
  const [confirm, setConfirm] = useState(null);
  const inputRef = useRef(null);

  // Build rows: unique category+subcategory pairs for this type
  const rows = [];
  const seen = new Set();
  for (const t of taxonomy) {
    if (t.type !== type) continue;
    const k = `${t.category}|${t.subcategory}`;
    if (!seen.has(k)) { seen.add(k); rows.push({ category: t.category, subcategory: t.subcategory }); }
  }

  // Group by category
  const categoryGroups = [];
  const catSeen = new Set();
  for (const r of rows) {
    if (!catSeen.has(r.category)) { catSeen.add(r.category); categoryGroups.push(r.category); }
  }

  function getKey(category, subcategory, month) {
    return `${type}|${category}|${subcategory}|${month}`;
  }

  function startEdit(category, subcategory, month) {
    const k = getKey(category, subcategory, month);
    const current = budgetMap[k];
    setEditing(k);
    setEditVal(current != null ? String(current) : '');
    setTimeout(() => inputRef.current?.select(), 10);
  }

  async function commitEdit(category, subcategory, month) {
    const val = editVal.trim();
    const amount = val === '' ? null : Number(val);
    if (val !== '' && (isNaN(amount) || amount < 0)) { setEditing(null); return; }
    if (amount !== null) {
      await onSave([{ month, type, category, subcategory, amount }]);
    }
    setEditing(null);
  }

  function handleKeyDown(e, category, subcategory, month, rowIdx) {
    if (e.key === 'Escape') { setEditing(null); return; }
    if (e.key === 'Tab') {
      e.preventDefault();
      commitEdit(category, subcategory, month);
      const mi = months.indexOf(month);
      if (mi < months.length - 1) startEdit(category, subcategory, months[mi + 1]);
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit(category, subcategory, month);
      const nextRow = rows[rowIdx + 1];
      if (nextRow) startEdit(nextRow.category, nextRow.subcategory, month);
    }
  }

  function colSum(month) {
    return rows.filter(r => budgetMap[getKey(r.category, r.subcategory, month)] != null)
      .reduce((s, r) => s + (budgetMap[getKey(r.category, r.subcategory, month)] || 0), 0);
  }

  function catSum(category, month) {
    return rows.filter(r => r.category === category && budgetMap[getKey(r.category, r.subcategory, month)] != null)
      .reduce((s, r) => s + (budgetMap[getKey(r.category, r.subcategory, month)] || 0), 0);
  }

  async function handleCopyRow(category, subcategory, seedMonth) {
    if (!seedMonth) return alert('Set a seed month first');
    const seedKey = getKey(category, subcategory, seedMonth);
    const seedVal = budgetMap[seedKey] || 0;
    const rowsToSave = months.filter(m => m !== seedMonth).map(m => ({ month: m, type, category, subcategory, amount: seedVal }));
    await onSave(rowsToSave);
    setConfirm(null);
  }

  async function handleClearRow(category, subcategory) {
    const rowsToSave = months.map(m => ({ month: m, type, category, subcategory, amount: 0 }));
    await onSave(rowsToSave);
    setConfirm(null);
  }

  if (rows.length === 0) return <p className="text-center text-gray-400 py-8">No subcategories for {type}.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="sticky left-0 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700 border-b border-r min-w-48">Category / Subcategory</th>
            {months.map(m => (
              <th key={m} className="px-2 py-2 text-center font-semibold text-gray-700 border-b min-w-24 whitespace-nowrap">{getMonthLabel(m)}</th>
            ))}
            <th className="px-2 py-2 text-center font-semibold text-gray-700 border-b min-w-24">FY Total</th>
          </tr>
        </thead>
        <tbody>
          {categoryGroups.map(cat => {
            const catRows = rows.filter(r => r.category === cat);
            const fyTotal = months.reduce((s, m) => s + (catSum(cat, m) || 0), 0);
            return [
              <tr key={`cat-${cat}`} className="bg-gray-100">
                <td className="sticky left-0 bg-gray-100 px-3 py-1 font-bold text-gray-800 border-r">{cat}</td>
                {months.map(m => (
                  <td key={m} className="px-2 py-1 text-center font-semibold text-gray-700">
                    {catSum(cat, m) > 0 ? formatINR(catSum(cat, m)) : '—'}
                  </td>
                ))}
                <td className="px-2 py-1 text-center font-bold">{fyTotal > 0 ? formatINR(fyTotal) : '—'}</td>
              </tr>,
              ...catRows.map((row, ri) => {
                const rowIdx = rows.indexOf(row);
                const rowFYTotal = months.reduce((s, m) => s + (budgetMap[getKey(row.category, row.subcategory, m)] || 0), 0);
                return (
                  <tr key={`${cat}-${row.subcategory}`} className="hover:bg-blue-50">
                    <td className="sticky left-0 bg-white px-3 py-1 text-gray-700 border-r flex items-center justify-between">
                      <span>{row.subcategory}</span>
                      <div className="relative group ml-2">
                        <button className="text-gray-400 hover:text-gray-700">⋯</button>
                        <div className="absolute left-0 hidden group-hover:block bg-white border rounded shadow-lg z-10 min-w-max">
                          <button onClick={() => setConfirm({ type: 'copyRow', category: row.category, subcategory: row.subcategory })}
                            className="block px-3 py-2 text-sm hover:bg-gray-50 w-full text-left">Copy across all months</button>
                          <button onClick={() => setConfirm({ type: 'clearRow', category: row.category, subcategory: row.subcategory })}
                            className="block px-3 py-2 text-sm hover:bg-gray-50 w-full text-left text-negative">Clear this row</button>
                        </div>
                      </div>
                    </td>
                    {months.map(m => {
                      const k = getKey(row.category, row.subcategory, m);
                      const val = budgetMap[k];
                      const isEdit = editing === k;
                      const actualVal = actuals[k];
                      return (
                        <td key={m} className="px-1 py-1 text-center border-b">
                          {isEdit ? (
                            <input ref={inputRef} type="number" min="0" step="0.01" value={editVal}
                              onChange={e => setEditVal(e.target.value)}
                              onBlur={() => commitEdit(row.category, row.subcategory, m)}
                              onKeyDown={e => handleKeyDown(e, row.category, row.subcategory, m, rowIdx)}
                              className="w-20 border rounded px-1 py-0.5 text-center text-xs" />
                          ) : (
                            <span onClick={() => startEdit(row.category, row.subcategory, m)}
                              className="cursor-pointer hover:bg-blue-100 px-2 py-0.5 rounded">
                              {val != null ? formatINR(val) : '—'}
                            </span>
                          )}
                          {showActuals && actualVal != null && (
                            <div className="text-gray-400 text-xs">{formatINR(actualVal)}</div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1 text-center font-medium">{rowFYTotal > 0 ? formatINR(rowFYTotal) : '—'}</td>
                  </tr>
                );
              }),
            ];
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 font-bold border-t-2">
            <td className="sticky left-0 bg-gray-50 px-3 py-2 border-r">Monthly Total</td>
            {months.map(m => (
              <td key={m} className="px-2 py-2 text-center">{colSum(m) > 0 ? formatINR(colSum(m)) : '—'}</td>
            ))}
            <td className="px-2 py-2 text-center">
              {formatINR(months.reduce((s, m) => s + colSum(m), 0))}
            </td>
          </tr>
        </tfoot>
      </table>

      {confirm?.type === 'copyRow' && (
        <ConfirmDialog
          message={`Copy ${confirm.subcategory} values across all other months? This will overwrite existing values.`}
          onConfirm={() => handleCopyRow(confirm.category, confirm.subcategory)}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.type === 'clearRow' && (
        <ConfirmDialog
          message={`Clear all budget values for ${confirm.subcategory}? All 12 months will be set to blank.`}
          onConfirm={() => handleClearRow(confirm.category, confirm.subcategory)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
