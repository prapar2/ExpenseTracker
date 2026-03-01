import { formatINR } from '../utils/formatUtils';

export default function KPICard({ label, amount, colorClass, onClick }) {
  return (
    <div 
      className={`card p-4 flex flex-col ${onClick ? 'cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        {onClick && (
          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
      <p className={`text-2xl font-bold ${colorClass || 'text-gray-900'}`}>
        {formatINR(amount)}
      </p>
    </div>
  );
}
