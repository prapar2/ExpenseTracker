import { useState, useEffect, useCallback } from 'react';

export function useTransactions(month) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = month ? `/api/transactions?month=${month}` : '/api/transactions';
      const res = await fetch(url);
      if (!res.ok) throw new Error((await res.json()).error);
      setData(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  async function createTransaction(body) {
    const res = await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error((await res.json()).error);
    await load();
    return res.json();
  }

  async function updateTransaction(id, body) {
    const res = await fetch(`/api/transactions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error((await res.json()).error);
    await load();
  }

  async function deleteTransaction(id) {
    const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error((await res.json()).error);
    await load();
  }

  return { data, loading, error, reload: load, createTransaction, updateTransaction, deleteTransaction };
}
