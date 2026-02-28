import { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { TaxonomyProvider } from './context/TaxonomyContext';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budget from './pages/Budget';
import Categories from './pages/Categories';
import ConfirmDialog from './components/ConfirmDialog';
import { getFYLabel, getFYStart, getFYList } from './utils/dateUtils';
import { useReset } from './hooks/useReset';

const FY_START_MONTH = 4; // April — fixed

export default function App() {
  const currentFYStart = getFYStart(FY_START_MONTH);
  const fyList = getFYList(FY_START_MONTH, 1, 2);
  const [fyStart, setFyStart] = useState(currentFYStart);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const { reset, resetting, resetError } = useReset();

  const navCls = ({ isActive }) =>
    `px-4 py-2 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-accent text-white' : 'text-white hover:bg-white hover:bg-opacity-10'}`;

  async function handleReset() {
    try {
      await reset();
      window.location.reload();
    } catch { /* resetError displayed in modal */ }
  }

  return (
    <BrowserRouter>
      <TaxonomyProvider>
        <div className="min-h-screen bg-gray-100">
          {/* Navigation */}
          <nav className="bg-primary shadow-lg">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-lg mr-4">Finance Tracker</span>
                <NavLink to="/" end className={navCls}>Dashboard</NavLink>
                <NavLink to="/transactions" className={navCls}>Transactions</NavLink>
                <NavLink to="/budget" className={navCls}>Budget</NavLink>
                <NavLink to="/categories" className={navCls}>Categories</NavLink>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white text-xs opacity-75">{getFYLabel(fyStart)}</span>
                <button onClick={() => setSettingsOpen(true)} className="text-white text-xs hover:opacity-75 px-2 py-1 border border-white border-opacity-30 rounded">
                  ⚙ Settings
                </button>
              </div>
            </div>
          </nav>

          {/* Page content */}
          <main>
            <Routes>
              <Route path="/" element={<Dashboard fyStart={fyStart} />} />
              <Route path="/transactions" element={<Transactions fyStart={fyStart} />} />
              <Route path="/budget" element={<Budget fyStart={fyStart} />} />
              <Route path="/categories" element={<Categories />} />
            </Routes>
          </main>

          {/* Settings Modal */}
          {settingsOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
                <h2 className="text-lg font-semibold text-primary mb-4">Settings</h2>

                {/* FY Selector */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Financial Year</label>
                  <select value={fyStart} onChange={e => setFyStart(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm">
                    {fyList.map(fy => <option key={fy} value={fy}>{getFYLabel(fy)}</option>)}
                  </select>
                  <p className="text-xs text-warning mt-1">
                    All pages will show data for the selected financial year.
                  </p>
                </div>

                {/* Factory Reset */}
                <div className="mb-4 border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">Factory Reset</p>
                  <p className="text-xs text-gray-500 mb-2">
                    Clears all transactions, budgets, and categories, then re-seeds the default taxonomy. This cannot be undone.
                  </p>
                  {resetError && <p className="text-xs text-negative mb-2">{resetError}</p>}
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    disabled={resetting}
                    className="px-3 py-1.5 bg-negative text-white rounded text-sm hover:opacity-90 disabled:opacity-50">
                    {resetting ? 'Resetting…' : 'Factory Reset'}
                  </button>
                </div>

                <div className="flex justify-end">
                  <button onClick={() => setSettingsOpen(false)} className="px-4 py-2 bg-primary text-white rounded hover:opacity-90">
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Reset Confirm Dialog */}
          {showResetConfirm && (
            <ConfirmDialog
              message="This will permanently delete ALL transactions, budgets, and categories, then re-seed the default taxonomy. This cannot be undone. Are you sure?"
              onConfirm={handleReset}
              onCancel={() => setShowResetConfirm(false)}
            />
          )}
        </div>
      </TaxonomyProvider>
    </BrowserRouter>
  );
}
