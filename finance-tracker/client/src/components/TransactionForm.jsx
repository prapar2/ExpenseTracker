import { useState, useEffect } from 'react';
import { useTaxonomy } from '../context/TaxonomyContext';
import { todayISO, getFYStart } from '../utils/dateUtils';

const TYPES = ['Income', 'Expense', 'Saving'];

export default function TransactionForm({ initial, onSave, onCancel, fyStartMonth }) {
  const { getCategories, getSubcategories } = useTaxonomy();
  const today = todayISO();
  const fyStart = getFYStart(fyStartMonth);
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
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) e.amount = 'Must be a positive number';
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
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {content}
      {errors[key] && <p className="text-negative text-xs mt-1">{errors[key]}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-4 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {field('Date', 'date',
          <input type="date" value={form.date} min={fyStartDate} max={today}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-sm" />
        )}
        {field('Type', 'type',
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full border rounded px-3 py-2 text-sm">
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        )}
        {field('Category', 'category',
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full border rounded px-3 py-2 text-sm">
            <option value="">— Select —</option>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        )}
        {field('Subcategory', 'subcategory',
          <select value={form.subcategory} onChange={e => setForm(f => ({ ...f, subcategory: e.target.value }))} className="w-full border rounded px-3 py-2 text-sm" disabled={!form.category}>
            <option value="">— Select —</option>
            {subcategories.map(s => <option key={s}>{s}</option>)}
          </select>
        )}
        {field('Amount (₹)', 'amount',
          <input type="number" min="0.01" step="0.01" value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-sm" placeholder="0.00" />
        )}
        {field('Note', 'note',
          <input type="text" value={form.note} maxLength={200}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-sm" placeholder="Optional" />
        )}
      </div>
      {errors.submit && <p className="text-negative text-sm">{errors.submit}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded hover:opacity-90 disabled:opacity-50">
          {saving ? 'Saving…' : (initial ? 'Update' : 'Save')}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>}
      </div>
    </form>
  );
}
