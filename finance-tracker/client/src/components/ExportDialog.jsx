import { useState } from 'react';
import { API_BASE } from '../utils/apiUtils';
import { getFYList } from '../utils/dateUtils';

const FY_START_MONTH = 4; // April

export default function ExportDialog({ onClose, currentFyStart }) {
  const [status, setStatus] = useState('idle'); // idle, exporting, done
  const [error, setError] = useState(null);
  const fyList = getFYList(FY_START_MONTH, 1, 5);
  
  const [selectedFy, setSelectedFy] = useState(currentFyStart || fyList[0]);
  const [exportMonth, setExportMonth] = useState('');
  const [includeAllMonths, setIncludeAllMonths] = useState(true);

  async function handleExport() {
    setStatus('exporting');
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('fy_start', selectedFy);
      
      if (!includeAllMonths && exportMonth) {
        params.append('month', exportMonth);
      }

      const response = await fetch(`${API_BASE}/export?${params.toString()}`);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Export failed');
      }

      // Get the filename from content-disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `finance-export-${selectedFy}.xlsx`;
      if (contentDisposition && contentDisposition.includes('filename=')) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match) {
          filename = match[1].replace(/['"]/g, '');
        }
      }

      // Create blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setStatus('done');
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  }

  function handleClose() {
    onClose();
  }

  // Generate months for the selected FY
  const selectedFyYear = parseInt(selectedFy.split('-')[0]);
  const selectedFyMonth = parseInt(selectedFy.split('-')[1]);
  const months = [];
  for (let i = 0; i < 12; i++) {
    const monthNum = ((selectedFyMonth - 1 + i) % 12) + 1;
    const year = selectedFyYear + Math.floor((selectedFyMonth - 1 + i) / 12);
    const monthStr = `${year}-${String(monthNum).padStart(2, '0')}`;
    months.push(monthStr);
  }

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-slide-up">
        {/* Modal Header */}
        <div style={{ background: 'linear-gradient(to right, #1B3A6B, #2E75B6)' }} className="px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Export Data</h2>
            <p className="text-white/80 text-sm mt-1">Download your finance data as Excel</p>
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
        <div className="p-6 space-y-4">
          {status === 'idle' && (
            <>
              {/* FY Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Financial Year
                </label>
                <select 
                  value={selectedFy} 
                  onChange={e => {
                    setSelectedFy(e.target.value);
                    setExportMonth('');
                  }}
                  className="select w-full"
                >
                  {fyList.map(fy => (
                    <option key={fy} value={fy}>
                      FY {fy.split('-')[0]}-{fy.split('-')[1]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month Selection */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={includeAllMonths}
                    onChange={e => setIncludeAllMonths(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Export entire FY ({months.length} months)
                  </span>
                </label>

                {!includeAllMonths && (
                  <select 
                    value={exportMonth} 
                    onChange={e => setExportMonth(e.target.value)}
                    className="select w-full"
                  >
                    <option value="">Select a month</option>
                    {months.map(m => (
                      <option key={m} value={m}>
                        {new Date(m + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {error && (
                <div className="bg-red-100 border border-red-200 rounded-lg px-4 py-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Format Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Export format:</p>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>Date | Month | Remarks | Type | Category | Sub-Category | Actual Amount | Budget Amount</p>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  The exported file can be re-imported after making changes.
                </p>
              </div>
            </>
          )}

          {status === 'exporting' && (
            <div className="py-12 text-center">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-700 font-medium">Generating export...</p>
              <p className="text-gray-500 text-sm mt-1">Please wait</p>
            </div>
          )}

          {status === 'done' && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Export Complete</h3>
              <p className="text-gray-600 text-sm">
                Your data has been downloaded as an Excel file.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end">
          <button
            onClick={handleClose}
            className="btn-secondary"
          >
            {status === 'done' ? 'Close' : 'Cancel'}
          </button>
          {status !== 'done' && (
            <button
              onClick={handleExport}
              disabled={status === 'exporting' || (!includeAllMonths && !exportMonth)}
              className="btn-primary flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
