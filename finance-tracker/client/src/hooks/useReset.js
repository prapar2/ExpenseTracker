import { useState } from 'react';
import { API_BASE } from '../utils/apiUtils';

export function useReset() {
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState(null);

  async function reset(options = {}) {
    const { fyStart, fullReset } = options;
    setResetting(true);
    setResetError(null);
    try {
      const body = {};
      
      if (fullReset) {
        body.full = true;
      } else if (fyStart) {
        body.fy_start = fyStart;
      }
      
      const res = await fetch(`${API_BASE}/reset`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined
      });
      if (!res.ok) {
        const b = await res.json();
        throw new Error(b.error || `HTTP ${res.status}`);
      }
    } catch (e) {
      setResetError(e.message);
      throw e;
    } finally {
      setResetting(false);
    }
  }

  return { reset, resetting, resetError };
}
