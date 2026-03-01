import { formatINR } from '../utils/formatUtils';
import { calcProjection } from '../utils/calcUtils';
import { isElapsed, isCurrent } from '../utils/dateUtils';

export default function ProjectionCard({ monthData, fyStart }) {
  const proj = calcProjection(monthData);
  const elapsed = monthData.filter(m => isElapsed(m.month)).length;
  const future = monthData.filter(m => !isElapsed(m.month) && !isCurrent(m.month)).length;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Yearly Projection</h3>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
          {elapsed} months actuals • {future} months budgeted
        </span>
      </div>
      
      {proj.futureMissingBudget > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-start gap-2">
          <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-yellow-700">
            {proj.futureMissingBudget} future month{proj.futureMissingBudget > 1 ? 's have' : ' has'} no budget — projection may be understated.
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-xs text-blue-700 font-medium mb-1">Projected Income</p>
          <p className="text-lg font-bold text-blue-600">{formatINR(proj.income)}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <p className="text-xs text-red-700 font-medium mb-1">Projected Expense</p>
          <p className="text-lg font-bold text-red-600">{formatINR(proj.expense)}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-xs text-green-700 font-medium mb-1">Projected Saving</p>
          <p className="text-lg font-bold text-green-600">{formatINR(proj.saving)}</p>
        </div>
      </div>
      
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Projected Year-End Balance</p>
            <p className={`text-3xl font-bold ${proj.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatINR(proj.balance)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">
              Based on {elapsed} month{elapsed !== 1 ? 's' : ''} of actuals and {future} month{future !== 1 ? 's' : ''} of budgets.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
