const SEED_TAXONOMY = [
  // Income
  { type: 'Income', category: 'Salary', subcategories: ['Paycheck', 'Variable Bonus', 'Severance', 'Reimbursements', 'NPS', 'PF'] },
  { type: 'Income', category: 'Credit', subcategories: ['Emergency Fund', 'Loans'] },
  { type: 'Income', category: 'Cashback', subcategories: ['Cashback'] },
  { type: 'Income', category: 'Rent', subcategories: ['J2 Rent', 'A9 Rent', 'Deposit', 'Repair'] },
  { type: 'Income', category: 'Misc', subcategories: ['Interest', 'Dividend', 'Misc'] },
  { type: 'Income', category: 'Cash', subcategories: ['Cash'] },
  // Expense
  { type: 'Expense', category: 'Loan EMI', subcategories: ['Park Infinia A14-504 EMI', 'Park Infinia J2-1404 EMI', 'Car Loan EMI'] },
  { type: 'Expense', category: 'Rent', subcategories: ['Repair'] },
  { type: 'Expense', category: 'Personal', subcategories: ['Swaroop', 'Aai', 'Ujjwala Personal', 'Ujjwala Bishi', 'Medical', 'Dining', 'Clothes', 'Gifts', 'Misc'] },
  { type: 'Expense', category: 'Entertainment', subcategories: ['Movies', 'OTT Streaming', 'TV Recharge'] },
  { type: 'Expense', category: 'Utility', subcategories: ['Electricity Bill', 'Gas Bill', 'Water Bill', 'Paper Bill', 'Mobile Recharge', 'Internet Recharge'] },
  { type: 'Expense', category: 'Automobiles', subcategories: ['Petrol', 'Service', 'Auto Insurance', 'Auto Care'] },
  { type: 'Expense', category: 'Home Expense', subcategories: ['Grocery', 'Purchase', 'Repair'] },
  { type: 'Expense', category: 'Education', subcategories: ['School Fees', 'School Expense', 'Coaching Fees', 'Misc'] },
  { type: 'Expense', category: 'Learning', subcategories: ['IIM Fees', 'Misc'] },
  { type: 'Expense', category: 'Travel', subcategories: ['Hotel', 'Food & Travel', 'Misc'] },
  { type: 'Expense', category: 'Insurance', subcategories: ['LIC Monthly', 'LIC Quarterly', 'LIC Premium', 'Health Insurance', 'Term Insurance'] },
  { type: 'Expense', category: 'Taxes', subcategories: ['Property Tax', 'Swapnshree', 'A14 Maintenance', 'J2 Maintenance', 'Income Tax'] },
  { type: 'Expense', category: 'Cashback', subcategories: ['Cashback'] },
  { type: 'Expense', category: 'Exception', subcategories: ['Gold', 'Home Expense', 'Misc'] },
  // Saving
  { type: 'Saving', category: 'Emergency Fund', subcategories: ['MaxGain'] },
  { type: 'Saving', category: 'Equity', subcategories: ['Mutual Fund', 'India Stocks', 'US Stocks', 'Small Case'] },
  { type: 'Saving', category: 'Retirement', subcategories: ['NPS', 'PF'] },
];

function seedTaxonomy(db) {
  const count = db.prepare('SELECT COUNT(*) as c FROM taxonomy').get();
  if (count.c > 0) return;
  let order = 0;
  const insert = db.prepare('INSERT INTO taxonomy (type, category, subcategory, sort_order) VALUES (?, ?, ?, ?)');
  for (const group of SEED_TAXONOMY) {
    for (const sub of group.subcategories) {
      insert.run(group.type, group.category, sub, order++);
    }
  }
}

module.exports = { seedTaxonomy };
