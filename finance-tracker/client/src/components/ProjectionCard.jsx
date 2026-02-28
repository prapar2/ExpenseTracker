import { formatINR } from '../utils/formatUtils';
import { calcProjection } from '../utils/calcUtils';
import { getFYMonths, isElapsed, isCurrent } from '../utils/dateUtils';

export default function ProjectionCard({ monthData, fyStart }) {
  const proj = calcProjection(monthData);
  const elapsed = monthData.filter(m => isElapsed(m.month)).length;
  const future = monthData.filter(m => !isElapsed(m.month) && !isCurrent(m.month)).length;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-base font-semibold text-primary mb-3">Yearly Projection</h3>
      {proj.futureMissingBudget > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3 text-sm text-warning">
          {proj.futureMissingBudget} future month{proj.futureMissingBudget > 1 ? 's have' : ' has'} no budget — projection may be understated.
        </div>
      )}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">Projected Income</p>
          <p className="text-lg font-bold text-income">{formatINR(proj.income)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Projected Expense</p>
          <p className="text-lg font-bold text-expense">{formatINR(proj.expense)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Projected Saving</p>
          <p className="text-lg font-bold text-saving">{formatINR(proj.saving)}</p>
        </div>
      </div>
      <div className="border-t pt-3">
        <p className="text-xs text-gray-500 mb-1">Projected Year-End Balance</p>
        <p className={`text-3xl font-bold ${proj.balance >= 0 ? 'text-positive' : 'text-negative'}`}>
          {formatINR(proj.balance)}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Based on {elapsed} month{elapsed !== 1 ? 's' : ''} of actuals and {future} month{future !== 1 ? 's' : ''} of budgets.
        </p>
      </div>
    </div>
  );
}
