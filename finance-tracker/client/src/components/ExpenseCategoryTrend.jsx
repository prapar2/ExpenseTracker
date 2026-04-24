import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatINR } from '../utils/formatUtils';
import { getMonthLabel } from '../utils/dateUtils';

const TREND_COLORS = ['#2E75B6', '#B03030', '#1A6B3A', '#856404', '#6B3A1B', '#3A6B1B', '#9ca3af'];

export default function ExpenseCategoryTrend({ trendData }) {
  if (!trendData || !trendData.rows || trendData.rows.length === 0) {
    return (
      <div className="card p-4 text-center text-sm text-gray-400">
        No expense trend data available.
      </div>
    );
  }

  const { months, topCategories, rows } = trendData;

  // Build { month, Cat1: val, Cat2: val, ..., Other: val } per month
  const monthMap = {};
  for (const m of months) monthMap[m] = { name: getMonthLabel(m).slice(0, 3) };

  for (const r of rows) {
    if (!monthMap[r.month]) continue;
    const cat = topCategories.includes(r.category) ? r.category : 'Other';
    monthMap[r.month][cat] = (monthMap[r.month][cat] || 0) + r.total;
  }

  const chartData = months.map(m => monthMap[m]);
  const allCats = [...topCategories];
  const hasOther = chartData.some(d => d['Other'] > 0);
  if (hasOther) allCats.push('Other');

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-gray-900 mb-4">Expense Category Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 10 }}>
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} />
          <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} axisLine={{ stroke: '#e5e7eb' }} />
          <Tooltip
            formatter={(v, name) => [formatINR(v), name]}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          {allCats.map((cat, i) => (
            <Line
              key={cat}
              type="monotone"
              dataKey={cat}
              stroke={TREND_COLORS[i % TREND_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
