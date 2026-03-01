import { useState, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function ImportDialog({ onClose }) {
  const [status, setStatus] = useState('idle'); // idle, uploading, results
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.xlsx')) {
      setError('Please select an .xlsx file');
      return;
    }

    setStatus('uploading');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/api/import`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Import failed');
      }

      const data = await response.json();
      setResult(data);
      setStatus('results');
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  }

  function handleImportAnother() {
    setStatus('idle');
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleClose() {
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-slide-up">
        {/* Modal Header */}
        <div style={{ background: 'linear-gradient(to right, #1B3A6B, #2E75B6)' }} className="px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Import Data</h2>
            <p className="text-white/80 text-sm mt-1">Upload an Excel file to import</p>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {status === 'idle' && (
            <div className="space-y-4">
              {/* File Input */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="import-file"
                />
                <label htmlFor="import-file" className="cursor-pointer">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-gray-700 font-medium mb-1">
                    Click to select Excel file
                  </p>
                  <p className="text-gray-500 text-sm">
                    Supported format: .xlsx
                  </p>
                </label>
              </div>

              {/* Format Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Expected columns:</p>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>Date | Month | Remarks | Type | Category | Sub-Category | Actual Amount | Budget Amount</p>
                </div>
              </div>

              {error && (
                <div className="bg-red-100 border border-red-200 rounded-lg px-4 py-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>
          )}

          {status === 'uploading' && (
            <div className="py-12 text-center">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-700 font-medium">Importing data...</p>
              <p className="text-gray-500 text-sm mt-1">Please wait</p>
            </div>
          )}

          {status === 'results' && result && (
            <div className="space-y-4">
              {/* Success Header */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Import Complete</h3>
              </div>

              {/* Results Summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                {/* Transactions */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 font-medium">Transactions</span>
                  <div className="flex items-center gap-2">
                    {result.transactions.inserted > 0 && (
                      <span className="text-positive font-semibold">
                        ✅ {result.transactions.inserted} inserted
                      </span>
                    )}
                    {result.transactions.skipped > 0 && (
                      <span className="text-amber-600 font-semibold">
                        ⚠ {result.transactions.skipped} skipped
                      </span>
                    )}
                    {result.transactions.inserted === 0 && result.transactions.skipped === 0 && (
                      <span className="text-gray-500">No data</span>
                    )}
                  </div>
                </div>

                {/* Budgets */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 font-medium">Budgets</span>
                  <div className="flex items-center gap-2">
                    {result.budgets.upserted > 0 && (
                      <span className="text-positive font-semibold">
                        ✅ {result.budgets.upserted} upserted
                      </span>
                    )}
                    {result.budgets.upserted === 0 && (
                      <span className="text-gray-500">No data</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Errors */}
              {result.errors && result.errors.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Errors ({result.errors.length} rows skipped):
                  </p>
                  <div className="bg-red-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                    {result.errors.map((err, idx) => (
                      <p key={idx} className="text-xs text-negative">
                        Row {err.row} — {err.reason}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {status === 'results' && (
          <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end">
            <button
              onClick={handleImportAnother}
              className="btn-secondary"
            >
              Import Another File
            </button>
            <button
              onClick={handleClose}
              className="btn-primary"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
