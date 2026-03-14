import { useState, useEffect } from 'react';
import { useTaxonomy } from '../context/TaxonomyContext';
import { todayISO } from '../utils/dateUtils';

const TYPES = ['Income', 'Expense', 'Saving'];

export default function TransactionForm({ initial, onSave, onCancel, fyStart }) {
  const { getCategories, getSubcategories } = useTaxonomy();
  const today = todayISO();
  const fyStartDate = fyStart + '-01';

  const [form, setForm] = useState({
    date: initial?.date || today,
    type: initial?.type || 'Expense',
    category: initial?.category || '',
    subcategory: initial?.subcategory || '',
    amount: initial?.amount || '',
    note: initial?.note || '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const categories = getCategories(form.type);
  const subcategories = form.category ? getSubcategories(form.type, form.category) : [];

  useEffect(() => {
    if (!categories.includes(form.category)) {
      setForm(f => ({ ...f, category: '', subcategory: '' }));
    }
  }, [form.type]);

  useEffect(() => {
    if (!subcategories.includes(form.subcategory)) {
      setForm(f => ({ ...f, subcategory: '' }));
    }
  }, [form.category]);

  function validate() {
    const e = {};
    if (!form.date) e.date = 'Required';
    else if (form.date > today) e.date = 'Future dates not allowed';
    else if (form.date < fyStartDate) e.date = 'Date is before current FY start';
    if (!form.type) e.type = 'Required';
    if (!form.category) e.category = 'Required';
    if (!form.subcategory) e.subcategory = 'Required';
    // Income must be positive; Expense/Saving can be negative (refunds/withdrawals)
    const isIncome = form.type === 'Income';
    if (!form.amount || isNaN(form.amount) || (isIncome && Number(form.amount) <= 0) || (!isIncome && Number(form.amount) === 0)) {
      e.amount = isIncome ? 'Must be a positive number' : 'Cannot be zero';
    }
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    try {
      await onSave({ ...form, amount: Number(Number(form.amount).toFixed(2)) });
      if (!initial) {
        setForm(f => ({ ...f, date: today, category: '', subcategory: '', amount: '', note: '' }));
      }
      setErrors({});
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setSaving(false);
    }
  }

  const field = (label, key, content) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {content}
      {errors[key] && <p className="text-xs text-red-600 mt-1">{errors[key]}</p>}
    </div>
  );

  const typeButtonStyles = {
    Income: { active: 'bg-blue-100 border-blue-500 text-blue-700', inactive: 'bg-white border-gray-300 text-gray-600 hover:border-gray-400' },
    Expense: { active: 'bg-red-100 border-red-500 text-red-700', inactive: 'bg-white border-gray-300 text-gray-600 hover:border-gray-400' },
    Saving: { active: 'bg-green-100 border-green-500 text-green-700', inactive: 'bg-white border-gray-300 text-gray-600 hover:border-gray-400' },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {field('Date', 'date',
          <input 
            type="date" 
            value={form.date} 
            min={fyStartDate} 
            max={today}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="input" 
          />
        )}
        {field('Type', 'type',
          <div className="flex gap-2">
            {TYPES.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setForm(f => ({ ...f, type: t }))}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg border transition-all ${form.type === t ? typeButtonStyles[t].active : typeButtonStyles[t].inactive}`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
        {field('Category', 'category',
          <select 
            value={form.category} 
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))} 
            className="select"
          >
            <option value="">— Select —</option>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        )}
        {field('Subcategory', 'subcategory',
          <select 
            value={form.subcategory} 
            onChange={e => setForm(f => ({ ...f, subcategory: e.target.value }))} 
            className="select" 
            disabled={!form.category}
          >
            <option value="">— Select —</option>
            {subcategories.map(s => <option key={s}>{s}</option>)}
          </select>
        )}
        {field('Amount (₹)', 'amount',
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
            <input 
              type="number" 
              step="0.01" 
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="input pl-7" 
              placeholder={form.type === 'Income' ? "0.00" : "-0.00 for refunds/withdrawals"}
            />
          </div>
        )}
        {field('Note', 'note',
          <input 
            type="text" 
            value={form.note} 
            maxLength={200}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            className="input" 
            placeholder="Optional note..." 
          />
        )}
      </div>
      {errors.submit && (
        <div className="bg-red-100 border border-red-200 rounded-lg px-4 py-2">
          <p className="text-sm text-red-600">{errors.submit}</p>
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <button 
          type="submit" 
          disabled={saving} 
          className="btn-primary"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {initial ? 'Update' : 'Save'} Transaction
            </span>
          )}
        </button>
        {onCancel && (
          <button 
            type="button" 
            onClick={onCancel} 
            className="btn-ghost"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
