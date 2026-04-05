import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../utils/apiUtils';

export function useTransactions(month, fyStart) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url;
      if (month) {
        // Fetch transactions for a specific month
        url = `${API_BASE}/transactions?month=${month}`;
      } else if (fyStart) {
        // Fetch all transactions for the FY
        url = `${API_BASE}/transactions?fy_start=${fyStart}`;
      } else {
        // Fallback: fetch all transactions
        url = `${API_BASE}/transactions`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error((await res.json()).error);
      setData(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [month, fyStart]);

  useEffect(() => { load(); }, [load]);

  async function createTransaction(body) {
    const res = await fetch(`${API_BASE}/transactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error((await res.json()).error);
    await load();
    return res.json();
  }

  async function updateTransaction(id, body) {
    const res = await fetch(`${API_BASE}/transactions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error((await res.json()).error);
    await load();
  }

  async function deleteTransaction(id) {
    const res = await fetch(`${API_BASE}/transactions/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error((await res.json()).error);
    await load();
  }

  return { data, loading, error, reload: load, createTransaction, updateTransaction, deleteTransaction };
}
