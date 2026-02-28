import { useState, useEffect } from 'react';
import { useTaxonomy } from '../context/TaxonomyContext';
import { useTaxonomyActions } from '../hooks/useTaxonomy';
import ConfirmDialog from '../components/ConfirmDialog';

const TYPES = ['Income', 'Expense', 'Saving'];

export default function Categories() {
  const { items, reload } = useTaxonomy();
  const actions = useTaxonomyActions();
  const [selectedType, setSelectedType] = useState('Income');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editVal, setEditVal] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const [addingSub, setAddingSub] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState(null);

  // Categories for selected type
  const catSeen = new Set();
  const categories = items
    .filter(i => i.type === selectedType)
    .filter(i => { if (catSeen.has(i.category)) return false; catSeen.add(i.category); return true; })
    .map(i => ({ name: i.category, id: items.find(x => x.type === selectedType && x.category === i.category)?.id }));

  // Subcategories for selected category
  const subcategories = selectedCategory
    ? items.filter(i => i.type === selectedType && i.category === selectedCategory)
    : [];

  useEffect(() => {
    if (categories.length > 0 && !categories.find(c => c.name === selectedCategory)) {
      setSelectedCategory(categories[0]?.name || null);
    }
  }, [selectedType, items]);

  async function handleRename(id, newName, field) {
    setError(null);
    try {
      await actions.updateEntry(id, { [field]: newName });
      await reload();
      setEditingId(null);
    } catch (e) { setError(e.message); }
  }

  async function handleDelete(id, name, hasBudgets) {
    setConfirm({
      message: hasBudgets
        ? `Budget data for "${name}" will be permanently deleted. Continue?`
        : `Delete "${name}"? This action cannot be undone.`,
      onConfirm: async () => {
        setError(null);
        try {
          await actions.deleteEntry(id);
          await reload();
          setConfirm(null);
        } catch (e) { setError(e.message); setConfirm(null); }
      },
    });
  }

  async function addCategory() {
    if (!newCatName.trim()) return;
    setError(null);
    try {
      await actions.createEntry({ type: selectedType, category: newCatName.trim(), subcategory: newCatName.trim() });
      await reload();
      setAddingCat(false);
      setNewCatName('');
    } catch (e) { setError(e.message); }
  }

  async function addSubcategory() {
    if (!newSubName.trim() || !selectedCategory) return;
    setError(null);
    try {
      await actions.createEntry({ type: selectedType, category: selectedType, subcategory: newSubName.trim() });
      await reload();
      setAddingSub(false);
      setNewSubName('');
    } catch (e) { setError(e.message); }
  }

  const Panel = ({ title, items: panelItems, onSelect, selectedName, onAdd, addingState, addName, setAddName, onAddSubmit, onAddCancel, renderItem }) => (
    <div className="border border-gray-200 rounded-xl flex flex-col overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-semibold text-gray-700 text-sm flex items-center justify-between">
        {title}
        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{panelItems.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {panelItems.length === 0 && !addingState && (
          <p className="text-center text-gray-400 text-sm py-8">No items yet.</p>
        )}
        {panelItems.map(item => renderItem(item))}
        {addingState && (
          <div className="p-3 flex gap-2 border-t bg-gray-50">
            <input 
              autoFocus 
              value={addName} 
              onChange={e => setAddName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onAddSubmit(); if (e.key === 'Escape') onAddCancel(); }}
              className="input flex-1 text-sm" 
              placeholder="Name..." 
            />
            <button onClick={onAddSubmit} className="btn-accent text-xs px-3">Add</button>
            <button onClick={onAddCancel} className="btn-ghost text-xs px-3">Cancel</button>
          </div>
        )}
      </div>
      <div className="border-t p-3 bg-gray-50">
        <button onClick={onAdd} className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add
        </button>
      </div>
    </div>
  );

  const renderCategory = (cat) => {
    const isSelected = cat.name === selectedCategory;
    const isEditing = editingId === `cat-${cat.name}`;
    return (
      <div 
        key={cat.name} 
        onClick={() => setSelectedCategory(cat.name)}
        className={`flex items-center gap-2 px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
          isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
        }`}
      >
        {isEditing ? (
          <input 
            autoFocus 
            value={editVal} 
            onChange={e => setEditVal(e.target.value)}
            onBlur={() => { const rep = items.find(i => i.type === selectedType && i.category === cat.name); if (rep) handleRename(rep.id, editVal, 'category'); }}
            onKeyDown={e => { if (e.key === 'Enter') { const rep = items.find(i => i.type === selectedType && i.category === cat.name); if (rep) handleRename(rep.id, editVal, 'category'); } if (e.key === 'Escape') setEditingId(null); }}
            className="input flex-1 text-sm" 
            onClick={e => e.stopPropagation()} 
          />
        ) : (
          <span className={`flex-1 text-sm font-medium ${isSelected ? 'text-blue-600' : 'text-gray-700'}`}>{cat.name}</span>
        )}
        <button 
          onClick={e => { e.stopPropagation(); setEditingId(`cat-${cat.name}`); setEditVal(cat.name); }} 
          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
          title="Edit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button 
          onClick={e => {
            e.stopPropagation();
            const catItems = items.filter(i => i.type === selectedType && i.category === cat.name);
            handleDelete(catItems[0]?.id, cat.name, false);
          }} 
          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
          title="Delete"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    );
  };

  const renderSubcategory = (item) => {
    const isEditing = editingId === `sub-${item.id}`;
    return (
      <div key={item.id} className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
        {isEditing ? (
          <input 
            autoFocus 
            value={editVal} 
            onChange={e => setEditVal(e.target.value)}
            onBlur={() => handleRename(item.id, editVal, 'subcategory')}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(item.id, editVal, 'subcategory'); if (e.key === 'Escape') setEditingId(null); }}
            className="input flex-1 text-sm" 
          />
        ) : (
          <span className="flex-1 text-sm text-gray-700">{item.subcategory}</span>
        )}
        <button 
          onClick={() => { setEditingId(`sub-${item.id}`); setEditVal(item.subcategory); }} 
          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
          title="Edit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button 
          onClick={() => handleDelete(item.id, item.subcategory, false)} 
          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
          title="Delete"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    );
  };

  const typeBgColors = {
    Income: 'bg-blue-50',
    Expense: 'bg-red-50',
    Saving: 'bg-green-50'
  };
  
  const typeTextColors = {
    Income: 'text-blue-600',
    Expense: 'text-red-600',
    Saving: 'text-green-600'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manage Categories</h1>
        <p className="text-sm text-gray-500 mt-1">Organize your transaction types, categories, and subcategories</p>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-100 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Transaction Types */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-semibold text-gray-700 text-sm flex items-center justify-between">
            Transaction Types
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{TYPES.length}</span>
          </div>
          <div className="flex-1">
            {TYPES.map(t => (
              <div 
                key={t} 
                onClick={() => setSelectedType(t)}
                className={`px-4 py-4 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                  selectedType === t 
                    ? typeBgColors[t]
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-medium text-sm ${selectedType === t ? typeTextColors[t] : 'text-gray-700'}`}>
                    {t}
                  </span>
                  {selectedType === t && (
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t p-3 bg-gray-50 text-xs text-gray-400">
            Transaction types are fixed
          </div>
        </div>

        {/* Middle: Categories */}
        <Panel
          title={`${selectedType} Categories`}
          items={categories}
          selectedName={selectedCategory}
          addingState={addingCat}
          addName={newCatName}
          setAddName={setNewCatName}
          onAdd={() => setAddingCat(true)}
          onAddSubmit={addCategory}
          onAddCancel={() => { setAddingCat(false); setNewCatName(''); }}
          renderItem={renderCategory}
        />

        {/* Right: Subcategories */}
        <Panel
          title={selectedCategory ? `${selectedCategory} Subcategories` : 'Subcategories'}
          items={subcategories}
          selectedName={null}
          addingState={addingSub}
          addName={newSubName}
          setAddName={setNewSubName}
          onAdd={() => setAddingSub(true)}
          onAddSubmit={addSubcategory}
          onAddCancel={() => { setAddingSub(false); setNewSubName(''); }}
          renderItem={renderSubcategory}
        />
      </div>

      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
