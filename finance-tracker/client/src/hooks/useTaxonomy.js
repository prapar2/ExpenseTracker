import { useTaxonomy } from '../context/TaxonomyContext';
import { API_BASE } from '../utils/apiUtils';

export { useTaxonomy };

export function useTaxonomyActions() {
  async function createEntry(body) {
    const res = await fetch(`${API_BASE}/taxonomy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  }

  async function updateEntry(id, body) {
    const res = await fetch(`${API_BASE}/taxonomy/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  }

  async function deleteEntry(id) {
    const res = await fetch(`${API_BASE}/taxonomy/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  }

  async function reorderEntries(items) {
    const res = await fetch(`${API_BASE}/taxonomy/reorder`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(items) });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  }

  return { createEntry, updateEntry, deleteEntry, reorderEntries };
}
