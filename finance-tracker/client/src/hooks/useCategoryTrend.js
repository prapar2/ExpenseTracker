import { useState, useEffect } from 'react';
import { API_BASE } from '../utils/apiUtils';

export function useCategoryTrend(fyStart, enabled, selectedMonths) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !fyStart) { setData(null); return; }
    setLoading(true);
    setError(null);
    let url = `${API_BASE}/dashboard/category-trend?fy_start=${fyStart}`;
    if (selectedMonths && selectedMonths.length < 12) {
      url += `&months=${selectedMonths.join(',')}`;
    }
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [fyStart, enabled, selectedMonths ? selectedMonths.join(',') : 'all']);

  return { data, loading, error };
}
