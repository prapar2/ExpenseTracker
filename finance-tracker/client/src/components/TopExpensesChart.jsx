import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatINR } from '../utils/formatUtils';

export default function TopExpensesChart({ budgetVsActual, onDrill }) {
  const byCat = {};
  for (const r of budgetVsActual.filter(r => r.type === 'Expense')) {
    if (!byCat[r.category]) byCat[r.category] = { actual: 0, budget: 0 };
    byCat[r.category].actual += r.actual;
    byCat[r.category].budget += (r.budget ?? 0);
  }

  const data = Object.entries(byCat)
    .map(([name, v]) => ({ name, actual: v.actual, budget: v.budget }))
    .sort((a, b) => b.actual - a.actual)
    .slice(0, 8);

  if (data.length === 0) {
    return (
      <div className="card p-4 text-center text-sm text-gray-400">
        No expense data this month.
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-gray-900 mb-4">Top Expense Categories</h3>
      <ResponsiveContainer width="100%" height={data.length * 48 + 30}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, bottom: 5, left: 10 }}>
          <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} axisLine={{ stroke: '#e5e7eb' }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#374151' }} width={100} axisLine={{ stroke: '#e5e7eb' }} />
          <Tooltip
            formatter={(v, name) => [formatINR(v), name === 'actual' ? 'Actual' : 'Budget']}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Bar dataKey="budget" fill="#d1d5db" radius={[0, 4, 4, 0]} barSize={14} name="Budget" />
          <Bar
            dataKey="actual"
            radius={[0, 4, 4, 0]}
            barSize={14}
            name="Actual"
            cursor="pointer"
            onClick={(entry) => onDrill && onDrill(entry.name)}
          >
            {data.map((_, i) => <Cell key={i} fill="#B03030" />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
