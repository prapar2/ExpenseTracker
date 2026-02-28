import { useTaxonomy } from '../context/TaxonomyContext';

export default function FilterBar({ filters, onChange }) {
  const { getCategories, getSubcategories } = useTaxonomy();
  const TYPES = ['Income', 'Expense', 'Saving'];

  const allCats = filters.types.length > 0
    ? filters.types.flatMap(t => getCategories(t))
    : TYPES.flatMap(t => getCategories(t));

  const allSubs = filters.categories.length > 0
    ? filters.categories.flatMap(c => {
        const type = TYPES.find(t => getCategories(t).includes(c));
        return type ? getSubcategories(type, c) : [];
      })
    : allCats.flatMap(c => {
        const type = TYPES.find(t => getCategories(t).includes(c));
        return type ? getSubcategories(type, c) : [];
      });

  function toggleItem(key, value) {
    const current = filters[key];
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    if (key === 'types') onChange({ types: next, categories: [], subcategories: [] });
    else if (key === 'categories') onChange({ ...filters, categories: next, subcategories: [] });
    else onChange({ ...filters, [key]: next });
  }

  function MultiSelect({ label, options, field }) {
    if (options.length === 0) return null;
    return (
      <div>
        <label className="block text-xs text-gray-500 mb-1">{label}</label>
        <div className="flex flex-wrap gap-1">
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => toggleItem(field, opt)}
              className={`text-xs px-2 py-1 rounded border ${filters[field].includes(opt) ? 'bg-accent text-white border-accent' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border rounded p-3 space-y-2">
      <MultiSelect label="Type" options={TYPES} field="types" />
      <MultiSelect label="Category" options={[...new Set(allCats)]} field="categories" />
      <MultiSelect label="Subcategory" options={[...new Set(allSubs)]} field="subcategories" />
    </div>
  );
}
