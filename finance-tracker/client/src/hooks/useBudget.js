import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../utils/apiUtils';

export function useBudget(fyStart) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!fyStart) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/budgets?fy_start=${fyStart}`);
      if (!res.ok) throw new Error((await res.json()).error);
      setData(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [fyStart]);

  useEffect(() => { load(); }, [load]);

  async function saveBulk(rows) {
    const res = await fetch(`${API_BASE}/budgets/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fy_start: fyStart, rows }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    await load();
  }

  return { data, loading, error, reload: load, saveBulk };
}
