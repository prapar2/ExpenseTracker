import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatINR } from '../utils/formatUtils';
import { getMonthLabel, isElapsed, isCurrent } from '../utils/dateUtils';

export default function CumulativeNetChart({ monthData }) {
  let cumulative = 0;
  const data = monthData.map(m => {
    const net = (isElapsed(m.month) || isCurrent(m.month))
      ? m.income_actual - m.expense_actual - m.saving_actual
      : m.income_budget - m.expense_budget - m.saving_budget;
    cumulative += net;
    return { name: getMonthLabel(m.month).slice(0, 3), cumulative };
  });

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-gray-900 mb-4">Cumulative Net Balance</h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 10 }}>
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} />
          <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} axisLine={{ stroke: '#e5e7eb' }} />
          <Tooltip
            formatter={(v) => [formatINR(v), 'Cumulative Net']}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <ReferenceLine y={0} stroke="#d1d5db" strokeDasharray="4 4" />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke="#1B3A6B"
            strokeWidth={2}
            fill="#1B3A6B"
            fillOpacity={0.15}
            dot={{ r: 4, fill: '#1B3A6B', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
