import { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { TaxonomyProvider } from './context/TaxonomyContext';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budget from './pages/Budget';
import Categories from './pages/Categories';
import { getFYLabel, getFYStart } from './utils/dateUtils';

const FY_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function App() {
  const [fyStartMonth, setFyStartMonth] = useState(4); // April default
  const [settingsOpen, setSettingsOpen] = useState(false);
  const fyStart = getFYStart(fyStartMonth);

  const navCls = ({ isActive }) =>
    `px-4 py-2 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-accent text-white' : 'text-white hover:bg-white hover:bg-opacity-10'}`;

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
              <Route path="/" element={<Dashboard fyStartMonth={fyStartMonth} />} />
              <Route path="/transactions" element={<Transactions fyStartMonth={fyStartMonth} />} />
              <Route path="/budget" element={<Budget fyStartMonth={fyStartMonth} />} />
              <Route path="/categories" element={<Categories />} />
            </Routes>
          </main>

          {/* Settings Modal */}
          {settingsOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
                <h2 className="text-lg font-semibold text-primary mb-4">Settings</h2>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Financial Year Start Month</label>
                  <select value={fyStartMonth} onChange={e => setFyStartMonth(Number(e.target.value))}
                    className="w-full border rounded px-3 py-2 text-sm">
                    {FY_MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                  </select>
                  <p className="text-xs text-warning mt-1">
                    Changing the FY start month will recalculate FY boundaries across the app. Existing data is not deleted.
                  </p>
                </div>
                <div className="flex justify-end">
                  <button onClick={() => setSettingsOpen(false)} className="px-4 py-2 bg-primary text-white rounded hover:opacity-90">
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </TaxonomyProvider>
    </BrowserRouter>
  );
}
