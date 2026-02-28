import { useState, useEffect } from 'react';

export function useDashboard(view, month, fyStart) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const url = view === 'monthly'
      ? `/api/dashboard/monthly?month=${month}`
      : `/api/dashboard/yearly?fy_start=${fyStart}`;
    fetch(url)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [view, month, fyStart]);

  return { data, loading, error };
}
