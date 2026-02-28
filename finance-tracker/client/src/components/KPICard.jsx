import { formatINR } from '../utils/formatUtils';

export default function KPICard({ label, amount, colorClass, onClick }) {
  const cls = `bg-white rounded-lg shadow p-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`;
  return (
    <div className={cls} onClick={onClick}>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colorClass || 'text-gray-900'}`}>{formatINR(amount)}</p>
    </div>
  );
}
