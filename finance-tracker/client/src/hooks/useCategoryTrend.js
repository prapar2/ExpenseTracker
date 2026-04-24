import { useState, useEffect } from 'react';
import { API_BASE } from '../utils/apiUtils';

export function useCategoryTrend(fyStart, enabled) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !fyStart) { setData(null); return; }
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/dashboard/category-trend?fy_start=${fyStart}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [fyStart, enabled]);

  return { data, loading, error };
}
