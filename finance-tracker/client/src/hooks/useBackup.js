import { useState, useCallback } from 'react';
import { API_BASE } from '../utils/apiUtils';

export function useBackup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastBackup, setLastBackup] = useState(null);

  // Get backup status
  const getStatus = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE}/backup/status`);
      
      if (!response.ok) throw new Error('Failed to fetch backup status');
      
      const data = await response.json();
      setLastBackup(data);
      return data;
    } catch (err) {
      const message = err.message || 'Failed to get backup status';
      setError(message);
      throw err;
    }
  }, []);

  // Create backup manually
  const createBackup = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE}/backup/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create backup');
      }

      const data = await response.json();
      
      // Refresh status
      await getStatus();
      
      return data;
    } catch (err) {
      const message = err.message || 'Failed to create backup';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getStatus]);

  // Restore from backup
  const restoreBackup = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/backup/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to restore backup');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const message = err.message || 'Failed to restore backup';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    lastBackup,
    getStatus,
    createBackup,
    restoreBackup,
    clearError: () => setError(null)
  };
}
