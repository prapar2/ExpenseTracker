import { isElapsed, isCurrent } from './dateUtils';

export function calcNet(income, expense, saving) {
  return income - expense - saving;
}

export function calcVariance(actual, budget) {
  if (budget == null) return null;
  return actual - budget;
}

export function calcPctUsed(actual, budget) {
  if (budget == null || budget === 0) return null;
  return actual / budget;
}

// Computes projected year-end totals for income/expense/saving
// monthData: array of { month, income_actual, expense_actual, saving_actual, income_budget, expense_budget, saving_budget }
export function calcProjection(monthData) {
  let income = 0, expense = 0, saving = 0;
  let futureMissingBudget = 0;

  for (const m of monthData) {
    if (isElapsed(m.month)) {
      income += m.income_actual;
      expense += m.expense_actual;
      saving += m.saving_actual;
    } else if (isCurrent(m.month)) {
      income += m.income_actual;
      expense += m.expense_actual;
      saving += m.saving_actual;
    } else {
      income += m.income_budget;
      expense += m.expense_budget;
      saving += m.saving_budget;
      if (m.income_budget === 0 && m.expense_budget === 0 && m.saving_budget === 0) {
        futureMissingBudget++;
      }
    }
  }

  return {
    income,
    expense,
    saving,
    balance: calcNet(income, expense, saving),
    futureMissingBudget,
  };
}
