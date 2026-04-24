import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { getMonthLabel, isElapsed, isCurrent } from '../utils/dateUtils';

const SAVINGS_TARGET_PCT = 20; // TODO: make configurable

export default function SavingsRateChart({ monthData }) {
  const data = monthData
    .filter(m => isElapsed(m.month) || isCurrent(m.month))
    .filter(m => m.income_actual > 0)
    .map(m => ({
      name: getMonthLabel(m.month).slice(0, 3),
      rate: parseFloat(((m.saving_actual / m.income_actual) * 100).toFixed(1)),
    }));

  if (data.length === 0) {
    return (
      <div className="card p-4 text-center text-sm text-gray-400">
        No savings rate data available yet.
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-gray-900 mb-4">Monthly Savings Rate</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 10 }}>
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} />
          <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={v => `${v}%`} axisLine={{ stroke: '#e5e7eb' }} />
          <Tooltip
            formatter={(v) => [`${v}%`, 'Savings Rate']}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <ReferenceLine y={SAVINGS_TARGET_PCT} stroke="#856404" strokeDasharray="6 3" label={{ value: `${SAVINGS_TARGET_PCT}% Target`, position: 'right', fontSize: 11, fill: '#856404' }} />
          <Line
            type="monotone"
            dataKey="rate"
            stroke="#1A6B3A"
            strokeWidth={3}
            dot={{ r: 5, fill: '#1A6B3A', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
