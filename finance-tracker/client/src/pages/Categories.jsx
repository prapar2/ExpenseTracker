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
      await actions.createEntry({ type: selectedType, category: selectedCategory, subcategory: newSubName.trim() });
      await reload();
      setAddingSub(false);
      setNewSubName('');
    } catch (e) { setError(e.message); }
  }

  const Panel = ({ title, items: panelItems, onSelect, selectedName, onAdd, addingState, addName, setAddName, onAddSubmit, onAddCancel, renderItem }) => (
    <div className="border rounded-lg flex flex-col" style={{ minHeight: 400 }}>
      <div className="bg-gray-50 px-3 py-2 border-b font-semibold text-gray-700 text-sm">{title}</div>
      <div className="flex-1 overflow-y-auto">
        {panelItems.length === 0 && !addingState && (
          <p className="text-center text-gray-400 text-sm py-6">No items yet.</p>
        )}
        {panelItems.map(item => renderItem(item))}
        {addingState && (
          <div className="p-2 flex gap-2 border-t">
            <input autoFocus value={addName} onChange={e => setAddName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onAddSubmit(); if (e.key === 'Escape') onAddCancel(); }}
              className="flex-1 border rounded px-2 py-1 text-sm" placeholder="Name…" />
            <button onClick={onAddSubmit} className="text-xs px-2 py-1 bg-accent text-white rounded">Add</button>
            <button onClick={onAddCancel} className="text-xs px-2 py-1 border rounded">Cancel</button>
          </div>
        )}
      </div>
      <div className="border-t p-2">
        <button onClick={onAdd} className="text-sm text-accent hover:underline">+ Add</button>
      </div>
    </div>
  );

  const renderCategory = (cat) => {
    const isSelected = cat.name === selectedCategory;
    const isEditing = editingId === `cat-${cat.name}`;
    return (
      <div key={cat.name} onClick={() => setSelectedCategory(cat.name)}
        className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${isSelected ? 'bg-blue-50' : ''}`}>
        {isEditing ? (
          <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)}
            onBlur={() => { const rep = items.find(i => i.type === selectedType && i.category === cat.name); if (rep) handleRename(rep.id, editVal, 'category'); }}
            onKeyDown={e => { if (e.key === 'Enter') { const rep = items.find(i => i.type === selectedType && i.category === cat.name); if (rep) handleRename(rep.id, editVal, 'category'); } if (e.key === 'Escape') setEditingId(null); }}
            className="flex-1 border rounded px-1 py-0.5 text-sm" onClick={e => e.stopPropagation()} />
        ) : (
          <span className="flex-1 text-sm">{cat.name}</span>
        )}
        <button onClick={e => { e.stopPropagation(); setEditingId(`cat-${cat.name}`); setEditVal(cat.name); }} className="text-xs text-gray-400 hover:text-accent">✎</button>
        <button onClick={e => {
          e.stopPropagation();
          const catItems = items.filter(i => i.type === selectedType && i.category === cat.name);
          const hasBudgets = false; // simplified — check done server side
          handleDelete(catItems[0]?.id, cat.name, false);
        }} className="text-xs text-gray-400 hover:text-negative">✕</button>
      </div>
    );
  };

  const renderSubcategory = (item) => {
    const isEditing = editingId === `sub-${item.id}`;
    return (
      <div key={item.id} className="flex items-center gap-2 px-3 py-2 border-b last:border-b-0 hover:bg-gray-50">
        {isEditing ? (
          <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)}
            onBlur={() => handleRename(item.id, editVal, 'subcategory')}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(item.id, editVal, 'subcategory'); if (e.key === 'Escape') setEditingId(null); }}
            className="flex-1 border rounded px-1 py-0.5 text-sm" />
        ) : (
          <span className="flex-1 text-sm">{item.subcategory}</span>
        )}
        <button onClick={() => { setEditingId(`sub-${item.id}`); setEditVal(item.subcategory); }} className="text-xs text-gray-400 hover:text-accent">✎</button>
        <button onClick={() => handleDelete(item.id, item.subcategory, false)} className="text-xs text-gray-400 hover:text-negative">✕</button>
      </div>
    );
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-primary mb-4">Manage Categories</h1>
      {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-negative text-sm">{error}</div>}
      <div className="grid grid-cols-3 gap-4">
        {/* Left: Transaction Types */}
        <div className="border rounded-lg flex flex-col" style={{ minHeight: 400 }}>
          <div className="bg-gray-50 px-3 py-2 border-b font-semibold text-gray-700 text-sm">Transaction Types</div>
          <div className="flex-1">
            {TYPES.map(t => (
              <div key={t} onClick={() => setSelectedType(t)}
                className={`px-3 py-3 cursor-pointer border-b last:border-b-0 hover:bg-gray-50 font-medium text-sm ${selectedType === t ? 'bg-blue-50 text-accent' : ''}`}>
                {t}
              </div>
            ))}
          </div>
          <div className="border-t p-2 text-xs text-gray-400">Types are fixed</div>
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
