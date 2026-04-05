import { useState, useEffect } from 'react';
import { useBackup } from '../hooks/useBackup';

export default function BackupRestore() {
  const { loading, error, lastBackup, getStatus, createBackup, restoreBackup, clearError } = useBackup();
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [credentialsReady, setCredentialsReady] = useState(true);
  const [setupUrl, setSetupUrl] = useState(null);

  // Get initial backup status
  useEffect(() => {
    getStatus()
      .then((result) => {
        if (result?.credentialsReady === false) {
          setCredentialsReady(false);
          setSetupUrl(result?.setupUrl);
        }
      })
      .catch(() => {
        // Silently handle error on mount
      });
  }, [getStatus]);

  const handleManualBackup = async () => {
    try {
      setCreatingBackup(true);
      const result = await createBackup();
      setSuccessMessage(`✅ Backup created: ${result.fileName}`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      // Error is handled in hook
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async () => {
    try {
      setRestoringBackup(true);
      const result = await restoreBackup();
      setSuccessMessage('✅ Database restored successfully. Refreshing app...');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      // Error is handled in hook
    } finally {
      setRestoringBackup(false);
      setShowRestoreConfirm(false);
    }
  };

  const handleOpenSetup = () => {
    window.open(setupUrl, '_blank');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="border-t border-gray-200 pt-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900 mb-3">Backup & Restore</p>

          {/* OAuth Setup Required */}
          {!credentialsReady && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs font-semibold text-yellow-900 mb-1">
                ⚠️ Google Drive backup setup required
              </p>
              <p className="text-xs text-yellow-700 mb-3">
                To enable automatic backups, authorize the app with your Google account:
              </p>
              <button
                onClick={handleOpenSetup}
                className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-yellow-600 text-white hover:bg-yellow-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Open Google Authorization
              </button>
              <p className="text-xs text-yellow-600 mt-2">
                After authorization, refresh the app to start using backups.
              </p>
            </div>
          )}

          {/* Backup Status */}
          {credentialsReady && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Last Backup:</p>
              <p className="text-sm font-semibold text-gray-900">
                {lastBackup?.lastBackup ? (
                  <>
                    <span>{formatDate(lastBackup.lastBackup.modified)}</span>
                    <span className="text-gray-500 font-normal"> ({formatSize(lastBackup.lastBackup.size)})</span>
                  </>
                ) : (
                  'No backups found'
                )}
              </p>
              {lastBackup?.daysOld !== undefined && (
                <p className="text-xs text-gray-500 mt-1">
                  {lastBackup.daysOld === 0 ? 'Today' : `${lastBackup.daysOld} days ago`}
                </p>
              )}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-3 p-3 bg-green-100 border border-green-200 rounded-lg">
              <p className="text-xs text-green-700">{successMessage}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-3 p-3 bg-red-100 border border-red-200 rounded-lg flex items-start gap-2">
              <svg className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs text-red-700 mb-2">{error}</p>
                <button
                  onClick={clearError}
                  className="text-xs text-red-600 hover:text-red-800 font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Actions - Only show if credentials ready */}
          {credentialsReady && (
            <div className="space-y-2">
              {/* Create Backup Button */}
              <button
                onClick={handleManualBackup}
                disabled={creatingBackup || loading}
                className={`w-full px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  creatingBackup || loading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {creatingBackup ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Creating backup...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Create Backup Now
                  </>
                )}
              </button>

              {/* Restore Button */}
              {!showRestoreConfirm ? (
                <button
                  onClick={() => setShowRestoreConfirm(true)}
                  disabled={!lastBackup?.lastBackup || restoringBackup || loading}
                  className={`w-full px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                    !lastBackup?.lastBackup || restoringBackup || loading
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  }`}
                >
                  {restoringBackup ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Restoring...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Restore from Backup
                    </>
                  )}
                </button>
              ) : (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs font-semibold text-red-900 mb-2">
                    ⚠️ Restore will replace current database with backup from {formatDate(lastBackup?.lastBackup?.modified)}
                  </p>
                  <p className="text-xs text-red-700 mb-3">
                    Current database will be saved for safety. Continue?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRestoreBackup}
                      disabled={restoringBackup}
                      className="flex-1 px-2 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {restoringBackup ? 'Restoring...' : 'Yes, Restore'}
                    </button>
                    <button
                      onClick={() => setShowRestoreConfirm(false)}
                      disabled={restoringBackup}
                      className="flex-1 px-2 py-1.5 bg-gray-300 text-gray-700 text-xs font-medium rounded hover:bg-gray-400 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-gray-500 mt-3">
            💾 Backups are automatically created every Sunday at midnight and stored on Google Drive. Weekly backups help prevent data loss from corruption or crashes.
          </p>
        </div>
      </div>
    </div>
  );
}
