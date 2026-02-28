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

  const typeStyles = {
    Income: { active: 'bg-blue-100 border-blue-300 text-blue-700', inactive: 'border-gray-200 hover:border-gray-300' },
    Expense: { active: 'bg-red-100 border-red-300 text-red-700', inactive: 'border-gray-200 hover:border-gray-300' },
    Saving: { active: 'bg-green-100 border-green-300 text-green-700', inactive: 'border-gray-200 hover:border-gray-300' },
  };

  function MultiSelect({ label, options, field, typeAware = false }) {
    if (options.length === 0) return null;
    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">{label}</label>
        <div className="flex flex-wrap gap-2">
          {options.map(opt => {
            const isActive = filters[field].includes(opt);
            const style = typeAware && typeStyles[opt] 
              ? (isActive ? typeStyles[opt].active : typeStyles[opt].inactive)
              : (isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 hover:border-gray-300');
            
            return (
              <button
                key={opt}
                onClick={() => toggleItem(field, opt)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${style}`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <MultiSelect label="Filter by Type" options={TYPES} field="types" typeAware />
      <MultiSelect label="Filter by Category" options={[...new Set(allCats)]} field="categories" />
      <MultiSelect label="Filter by Subcategory" options={[...new Set(allSubs)]} field="subcategories" />
    </div>
  );
}
