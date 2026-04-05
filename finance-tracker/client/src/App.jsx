import { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { TaxonomyProvider } from './context/TaxonomyContext';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budget from './pages/Budget';
import Categories from './pages/Categories';
import ConfirmDialog from './components/ConfirmDialog';
import ImportDialog from './components/ImportDialog';
import ExportDialog from './components/ExportDialog';
import { getFYLabel, getFYStart, getFYList } from './utils/dateUtils';
import { useReset } from './hooks/useReset';

const FY_START_MONTH = 4; // April — fixed

// Plain function — called once, no hooks needed
function getBasename() {
  const path = window.location.pathname;
  const match = path.match(/^(\/api\/hassio_ingress\/[^/]+)/);
  return match ? match[1] : '/';
}

// Call it once outside the component
const basename = getBasename();

export default function App() {
  const currentFYStart = getFYStart(FY_START_MONTH);
  const fyList = getFYList(FY_START_MONTH, 1, 2);
  const [fyStart, setFyStart] = useState(currentFYStart);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetType, setResetType] = useState('fy'); // 'fy' or 'full'
  const { reset, resetting, resetError } = useReset();

  const navLinkBase = "nav-link nav-link-inactive";
  const navLinkActive = "nav-link nav-link-active";

  async function handleReset() {
    try {
      if (resetType === 'full') {
        await reset({ fullReset: true });
      } else {
        await reset({ fyStart: fyStart });
      }
      window.location.reload();
    } catch { /* resetError displayed in modal */ }
  }

  function getResetConfirmMessage() {
    if (resetType === 'full') {
      return "This will permanently delete ALL transactions, budgets, and categories, then re-seed the default taxonomy. This cannot be undone. Are you sure?";
    }
    return `This will permanently delete all transactions and budgets for ${getFYLabel(fyStart)}. Categories will be preserved. This cannot be undone. Are you sure?`;
  }

  return (
    <BrowserRouter basename={basename}>
      <TaxonomyProvider>
        <div className="min-h-screen bg-gray-50">
          {/* Modern Navigation */}
          <nav style={{ background: 'linear-gradient(to right, #1B3A6B, #2E5F99)' }} className="shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                {/* Logo & Brand */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xl">₹</span>
                  </div>
                  <span className="text-white font-semibold text-lg hidden sm:block">Finance Tracker</span>
                </div>

                {/* Navigation Links */}
                <div className="hidden md:flex items-center gap-1 px-1">
                  <NavLink to="/" end className={({ isActive }) => isActive ? navLinkActive : navLinkBase}>
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      Dashboard
                    </span>
                  </NavLink>
                  <NavLink to="/transactions" className={({ isActive }) => isActive ? navLinkActive : navLinkBase}>
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Transactions
                    </span>
                  </NavLink>
                  <NavLink to="/budget" className={({ isActive }) => isActive ? navLinkActive : navLinkBase}>
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Budget
                    </span>
                  </NavLink>
                  <NavLink to="/categories" className={({ isActive }) => isActive ? navLinkActive : navLinkBase}>
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Categories
                    </span>
                  </NavLink>
                </div>

                {/* Right side - FY selector & Settings */}
                <div className="flex items-center gap-3">
                  {/* FY Badge */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5">
                    <span className="text-white/90 text-sm font-medium">{getFYLabel(fyStart)}</span>
                  </div>
                  
                  {/* Import Button */}
                  <button 
                    onClick={() => setShowImport(true)} 
                    className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-150"
                    title="Import"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  
                  {/* Export Button */}
                  <button 
                    onClick={() => setShowExport(true)} 
                    className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-150"
                    title="Export"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </button>
                  
                  {/* Settings Button */}
                  <button 
                    onClick={() => setSettingsOpen(true)} 
                    className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-150"
                    title="Settings"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </nav>

          {/* Page content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Routes>
              <Route path="/" element={<Dashboard fyStart={fyStart} />} />
              <Route path="/transactions" element={<Transactions fyStart={fyStart} />} />
              <Route path="/budget" element={<Budget fyStart={fyStart} />} />
              <Route path="/categories" element={<Categories />} />
            </Routes>
          </main>

          {/* Settings Modal - Modern Design */}
          {settingsOpen && (
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-slide-up">
                {/* Modal Header */}
                <div style={{ background: 'linear-gradient(to right, #1B3A6B, #2E75B6)' }} className="px-6 py-4">
                  <h2 className="text-xl font-semibold text-white">Settings</h2>
                  <p className="text-white/80 text-sm mt-1">Configure your preferences</p>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-6">
                  {/* FY Selector */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Financial Year
                    </label>
                    <select 
                      value={fyStart} 
                      onChange={e => setFyStart(e.target.value)}
                      className="select"
                    >
                      {fyList.map(fy => (
                        <option key={fy} value={fy}>
                          {getFYLabel(fy)}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      All pages will show data for the selected financial year.
                    </p>
                  </div>

                  {/* Factory Reset */}
                  <div className="border-t border-gray-200 pt-6">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 mb-2">Factory Reset</p>
                        
                        {/* Reset Type Selector */}
                        <div className="mb-3">
                          <label className="flex items-center gap-2 cursor-pointer mb-2">
                            <input
                              type="radio"
                              name="resetType"
                              checked={resetType === 'fy'}
                              onChange={() => setResetType('fy')}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-xs text-gray-700">
                              Reset Selected FY ({getFYLabel(fyStart)})
                            </span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="resetType"
                              checked={resetType === 'full'}
                              onChange={() => setResetType('full')}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-xs text-gray-700">
                              Reset Entire Database
                            </span>
                          </label>
                        </div>

                        <p className="text-xs text-gray-500 mb-3">
                          {resetType === 'full' 
                            ? "Clears all transactions, budgets, and categories, then re-seeds the default taxonomy. This cannot be undone."
                            : "Clears transactions and budgets for the selected FY only. Categories are preserved. This cannot be undone."
                          }
                        </p>
                        {resetError && (
                          <div className="bg-red-100 border border-red-200 rounded-lg px-3 py-2 mb-3">
                            <p className="text-xs text-red-600">{resetError}</p>
                          </div>
                        )}
                        <button
                          onClick={() => setShowResetConfirm(true)}
                          disabled={resetting}
                          className="btn-danger text-sm"
                        >
                          {resetting ? (
                            <span className="flex items-center gap-2">
                              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Resetting...
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Factory Reset
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-gray-50 px-6 py-4 flex justify-end">
                  <button 
                    onClick={() => setSettingsOpen(false)} 
                    className="btn-primary"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Reset Confirm Dialog */}
          {showResetConfirm && (
            <ConfirmDialog
              message={getResetConfirmMessage()}
              onConfirm={handleReset}
              onCancel={() => setShowResetConfirm(false)}
            />
          )}

          {/* Import Dialog */}
          {showImport && (
            <ImportDialog onClose={() => setShowImport(false)} />
          )}

          {/* Export Dialog */}
          {showExport && (
            <ExportDialog onClose={() => setShowExport(false)} currentFyStart={fyStart} />
          )}
        </div>
      </TaxonomyProvider>
    </BrowserRouter>
  );
}
