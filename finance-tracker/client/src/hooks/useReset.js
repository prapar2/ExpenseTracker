import { useState } from 'react';

export function useReset() {
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState(null);

  async function reset() {
    setResetting(true);
    setResetError(null);
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
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
