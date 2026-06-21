import { useState, useEffect } from 'react';
import { API_BASE } from '../utils/apiUtils';

export function useDashboard(view, month, fyStart, selectedMonths) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(null);
    setLoading(true);
    setError(null);
    let url;
    if (view === 'monthly') {
      url = `${API_BASE}/dashboard/monthly?month=${month}`;
    } else {
      url = `${API_BASE}/dashboard/yearly?fy_start=${fyStart}`;
      if (selectedMonths && selectedMonths.length < 12) {
        url += `&months=${selectedMonths.join(',')}`;
      }
    }
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [view, month, fyStart, selectedMonths ? selectedMonths.join(',') : 'all']);

  return { data, loading, error };
}
