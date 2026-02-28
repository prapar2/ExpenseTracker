import { formatINR, formatPct } from '../utils/formatUtils';

const TYPES = ['Income', 'Expense', 'Saving'];

export default function BudgetVsActualTable({ rows, onDrillActual, onDrillProjected }) {
  if (!rows || rows.length === 0) return <p className="text-center text-gray-400 py-6">No data for this period.</p>;

  const grouped = {};
  for (const r of rows) {
    if (!grouped[r.type]) grouped[r.type] = {};
    if (!grouped[r.type][r.category]) grouped[r.type][r.category] = [];
    grouped[r.type][r.category].push(r);
  }

  function varClass(variance, type) {
    if (variance == null) return 'text-gray-400';
    if (type === 'Income') return variance >= 0 ? 'text-positive' : 'text-warning';
    return variance <= 0 ? 'text-positive' : 'text-negative';
  }

  return (
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
          {TYPES.filter(t => grouped[t]).map(type =>
            Object.entries(grouped[type]).map(([cat, catRows]) => {
              const catActual = catRows.reduce((s, r) => s + r.actual, 0);
              const catBudget = catRows.every(r => r.budget !== null) ? catRows.reduce((s, r) => s + (r.budget || 0), 0) : null;
              return [
                <tr key={`cat-${type}-${cat}`} className="bg-gray-50">
                  <td className="px-3 py-2 font-bold text-gray-800">
                    <span className="text-xs text-gray-500 mr-2">{type}</span>{cat}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">{catBudget != null ? formatINR(catBudget) : '—'}</td>
                  <td className="px-3 py-2 text-right font-semibold">
                    <button onClick={() => onDrillActual(type, cat, null)} className="hover:underline text-accent">{formatINR(catActual)}</button>
                  </td>
                  <td colSpan={2}></td>
                </tr>,
                ...catRows.map(r => (
                  <tr key={`${type}-${cat}-${r.subcategory}`} className="hover:bg-gray-50 border-b">
                    <td className="px-3 py-2 pl-8 text-gray-700">{r.subcategory}</td>
                    <td className="px-3 py-2 text-right">{r.budget != null ? formatINR(r.budget) : '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => onDrillActual(type, cat, r.subcategory)} className="hover:underline text-accent">{formatINR(r.actual)}</button>
                    </td>
                    <td className={`px-3 py-2 text-right ${varClass(r.variance, type)}`}>{r.variance != null ? formatINR(r.variance) : '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{formatPct(r.pctUsed)}</td>
                  </tr>
                )),
              ];
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
