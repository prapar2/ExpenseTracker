import { useState, useEffect } from 'react';

export function useDashboard(view, month, fyStart) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Clear stale data immediately so the previous view's shape doesn't linger
    setData(null);
    setLoading(true);
    setError(null);
    const url = view === 'monthly'
      ? `/api/dashboard/monthly?month=${month}`
      : `/api/dashboard/yearly?fy_start=${fyStart}`;
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [view, month, fyStart]);

  return { data, loading, error };
}
