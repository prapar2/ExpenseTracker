import { formatINR } from '../utils/formatUtils';

export default function IncomeAllocationBar({ summary }) {
  const { income, expense, saving, net } = summary;

  if (income <= 0) {
    return (
      <div className="card p-4 text-center text-sm text-gray-400">
        No income recorded this month.
      </div>
    );
  }

  const expPct = Math.max(0, (expense / income) * 100);
  const savPct = Math.max(0, (saving / income) * 100);
  const netPct = Math.max(0, (net / income) * 100);
  const overPct = net < 0 ? Math.abs((net / income) * 100) : 0;

  const segments = [
    { label: 'Expense', pct: expPct, color: 'bg-red-500', textColor: 'text-white' },
    { label: 'Saving', pct: savPct, color: 'bg-green-500', textColor: 'text-white' },
    ...(net >= 0
      ? [{ label: 'Retained', pct: netPct, color: 'bg-blue-500', textColor: 'text-white' }]
      : [{ label: 'Deficit', pct: overPct, color: 'bg-gray-400', textColor: 'text-white' }]),
  ].filter(s => s.pct > 0);

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-gray-900 mb-3">Income Allocation</h3>
      <div className="flex rounded-lg overflow-hidden h-8">
        {segments.map(s => (
          <div
            key={s.label}
            className={`${s.color} ${s.textColor} flex items-center justify-center text-xs font-medium transition-all`}
            style={{ width: `${s.pct}%`, minWidth: s.pct > 5 ? undefined : '24px' }}
            title={`${s.label}: ${formatINR(s.label === 'Expense' ? expense : s.label === 'Saving' ? saving : Math.abs(net))} (${s.pct.toFixed(1)}%)`}
          >
            {s.pct >= 10 ? `${s.label} ${s.pct.toFixed(0)}%` : s.pct >= 5 ? `${s.pct.toFixed(0)}%` : ''}
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-2 text-xs text-gray-500">
        {segments.map(s => (
          <span key={s.label} className="flex items-center gap-1">
            <span className={`inline-block w-2.5 h-2.5 rounded-sm ${s.color}`}></span>
            {s.label}: {s.pct.toFixed(1)}%
          </span>
        ))}
      </div>
    </div>
  );
}
