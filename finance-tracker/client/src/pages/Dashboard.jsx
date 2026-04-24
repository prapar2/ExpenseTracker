import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, ReferenceLine } from 'recharts';
import KPICard from '../components/KPICard';
import ProjectionCard from '../components/ProjectionCard';
import MonthPicker from '../components/MonthPicker';
import BudgetVsActualTable from '../components/BudgetVsActualTable';
import IncomeAllocationBar from '../components/IncomeAllocationBar';
import TopExpensesChart from '../components/TopExpensesChart';
import CumulativeNetChart from '../components/CumulativeNetChart';
import SavingsRateChart from '../components/SavingsRateChart';
import ExpenseCategoryTrend from '../components/ExpenseCategoryTrend';
import { useDashboard } from '../hooks/useDashboard';
import { useCategoryTrend } from '../hooks/useCategoryTrend';
import { formatINR } from '../utils/formatUtils';
import { currentMonth, getFYMonths, getMonthLabel, isElapsed, isCurrent } from '../utils/dateUtils';

const TYPE_COLORS = { Income: '#2E75B6', Expense: '#B03030', Saving: '#1A6B3A' };
const DONUT_COLORS = ['#2E75B6','#B03030','#1A6B3A','#856404','#6B3A1B','#3A6B1B','#1B3A6B','#6B1B3A'];
const TYPES = ['Income', 'Expense', 'Saving'];

export default function Dashboard({ fyStart }) {
  const nav = useNavigate();
  const fyMonths = getFYMonths(fyStart);
  const [view, setView] = useState('monthly');
  const [month, setMonth] = useState(currentMonth());

  // Reset selected month when FY changes to avoid showing a month outside the new FY
  useEffect(() => { if (!fyMonths.includes(month)) setMonth(fyMonths[0]); }, [fyStart]);
  const [donutType, setDonutType] = useState('Expense');
  const [donutDrill, setDonutDrill] = useState(null);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [monthPickerCb, setMonthPickerCb] = useState(null);

  const { data, loading, error } = useDashboard(view, month, fyStart);
  const { data: trendData } = useCategoryTrend(fyStart, view === 'yearly');
  const [insightsOpen, setInsightsOpen] = useState(true);

  function drillTo(m, type, cat, sub) {
    nav('/transactions', { state: { month: m, types: type ? [type] : [], categories: cat ? [cat] : [], subcategories: sub ? [sub] : [] } });
  }
  function openMonthPicker(cb) { setMonthPickerCb(() => cb); setMonthPickerOpen(true); }

  function renderMonthly() {
    const { summary, budgetVsActual } = data;
    const donutRaw = budgetVsActual.filter(r => r.type === donutType);
    const donutByCat = {};
    for (const r of donutRaw) donutByCat[r.category] = (donutByCat[r.category] || 0) + r.actual;
    const donutData = Object.entries(donutByCat).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
    const donutSubData = donutDrill ? donutRaw.filter(r => r.category === donutDrill).map(r => ({ name: r.subcategory, value: r.actual })).filter(d => d.value > 0) : [];
    const activeDonut = donutDrill ? donutSubData : donutData;

    return (
      <div className="space-y-6">
        {/* KPI Cards - Modern Card Design */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Total Income" amount={summary.income} colorClass="text-blue-600" onClick={() => drillTo(month, 'Income', null, null)} />
          <KPICard label="Total Expense" amount={summary.expense} colorClass="text-red-600" onClick={() => drillTo(month, 'Expense', null, null)} />
          <KPICard label="Total Saving" amount={summary.saving} colorClass="text-green-600" onClick={() => drillTo(month, 'Saving', null, null)} />
          <KPICard label="Net" amount={summary.net} colorClass={summary.net >= 0 ? 'text-green-600' : 'text-red-600'} onClick={() => drillTo(month, null, null, null)} />
        </div>

        <IncomeAllocationBar summary={summary} />

        {/* Budget vs Actual - Modern Card */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Budget vs Actual</h3>
            <span className="text-xs text-gray-500">{getMonthLabel(month)}</span>
          </div>
          <BudgetVsActualTable rows={budgetVsActual} onDrillActual={(t, c, s) => drillTo(month, t, c, s)} />
        </div>

        {/* Spending Breakdown - Modern Card */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">{donutDrill ? `${donutDrill} Breakdown` : 'Spending Breakdown'}</h3>
              <p className="text-xs text-gray-500 mt-0.5">Click segments to drill down</p>
            </div>
            <div className="flex gap-2">
              {donutDrill && (
                <button onClick={() => setDonutDrill(null)} className="btn-ghost text-sm py-1.5">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
              )}
              {TYPES.map(t => (
                <button 
                  key={t} 
                  onClick={() => { setDonutType(t); setDonutDrill(null); }}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
                    donutType === t 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          {activeDonut.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
              <p className="text-gray-400">No {donutType} data this month.</p>
            </div>
          ) : (
            <div className="flex justify-center">
              <PieChart width={400} height={300}>
                <Pie 
                  data={activeDonut} 
                  cx={200} 
                  cy={140} 
                  innerRadius={80} 
                  outerRadius={120} 
                  dataKey="value" 
                  nameKey="name"
                  onClick={(e) => { if (!donutDrill) setDonutDrill(e.name); }}
                  paddingAngle={2}
                >
                  {activeDonut.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatINR(v)} />
                <Legend 
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  formatter={(value) => <span className="text-gray-600">{value}</span>}
                />
              </PieChart>
            </div>
          )}
        </div>

        <TopExpensesChart budgetVsActual={budgetVsActual} onDrill={(cat) => drillTo(month, 'Expense', cat, null)} />
      </div>
    );
  }

  function renderYearly() {
    const { months: monthData, ytd, budgetVsActual } = data;
    const elapsed = monthData.filter(m => isElapsed(m.month)).length;
    const remaining = monthData.filter(m => !isElapsed(m.month) && !isCurrent(m.month)).length;
    const barData = monthData.map(m => ({
      name: getMonthLabel(m.month).slice(0, 3),
      Income: isElapsed(m.month) || isCurrent(m.month) ? m.income_actual : m.income_budget,
      Expense: isElapsed(m.month) || isCurrent(m.month) ? m.expense_actual : m.expense_budget,
      Saving: isElapsed(m.month) || isCurrent(m.month) ? m.saving_actual : m.saving_budget,
    }));
    const netLine = monthData.map(m => ({
      name: getMonthLabel(m.month).slice(0, 3),
      net: (isElapsed(m.month) || isCurrent(m.month)) ? m.income_actual - m.expense_actual - m.saving_actual : m.income_budget - m.expense_budget - m.saving_budget,
    }));
    return (
      <div className="space-y-6">
        <ProjectionCard monthData={monthData} fyStart={fyStart} />
        
        {/* KPI Cards with Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <KPICard label="Income YTD" amount={ytd.income} colorClass="text-blue-600" onClick={() => openMonthPicker(m => drillTo(m, 'Income', null, null))} />
          <KPICard label="Expense YTD" amount={ytd.expense} colorClass="text-red-600" onClick={() => openMonthPicker(m => drillTo(m, 'Expense', null, null))} />
          <KPICard label="Saving YTD" amount={ytd.saving} colorClass="text-green-600" onClick={() => openMonthPicker(m => drillTo(m, 'Saving', null, null))} />
          <KPICard label="Net YTD" amount={ytd.net} colorClass={ytd.net >= 0 ? 'text-green-600' : 'text-red-600'} onClick={() => openMonthPicker(m => drillTo(m, null, null, null))} />
          
          {/* Stats Cards */}
          <div className="card p-4 flex flex-col items-center justify-center">
            <p className="text-xs text-gray-500 mb-1">Months Elapsed</p>
            <p className="text-3xl font-bold text-blue-600">{elapsed}</p>
          </div>
          <div className="card p-4 flex flex-col items-center justify-center">
            <p className="text-xs text-gray-500 mb-1">Months Remaining</p>
            <p className="text-3xl font-bold text-gray-600">{remaining}</p>
          </div>
        </div>

        {/* Month-by-Month Chart - Modern Card */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Month-by-Month Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 5, left: 10 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} axisLine={{ stroke: '#e5e7eb' }} />
              <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              {TYPES.map(t => <Bar key={t} dataKey={t} fill={TYPE_COLORS[t]} radius={[4, 4, 0, 0]} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Net Balance Trend - Modern Card */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Net Balance Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={netLine} margin={{ top: 5, right: 5, bottom: 5, left: 10 }}
              onClick={() => openMonthPicker(m => drillTo(m, null, null, null))}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} axisLine={{ stroke: '#e5e7eb' }} />
              <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <ReferenceLine y={0} stroke="#d1d5db" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="net" stroke="#1B3A6B" strokeWidth={3} dot={{ r: 5, fill: '#1B3A6B', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Annual Budget vs Actual - Modern Card */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Annual Budget vs Actual</h3>
          </div>
          <BudgetVsActualTable rows={budgetVsActual} onDrillActual={(t, c, s) => openMonthPicker(m => drillTo(m, t, c, s))} />
        </div>

        {/* Collapsible Insights Section */}
        <div className="card overflow-hidden">
          <button
            onClick={() => setInsightsOpen(o => !o)}
            className="w-full px-5 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-semibold text-gray-900">Insights</h3>
            <svg className={`w-5 h-5 text-gray-400 transition-transform ${insightsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {insightsOpen && (
            <div className="p-5 space-y-6">
              <CumulativeNetChart monthData={monthData} />
              <SavingsRateChart monthData={monthData} />
              <ExpenseCategoryTrend trendData={trendData} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Track your financial performance</p>
        </div>
        
        {/* View Toggle */}
        <div className="flex items-center gap-3">
          <div className="bg-gray-100 p-1 rounded-lg inline-flex">
            <button 
              onClick={() => setView('monthly')} 
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                view === 'monthly' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setView('yearly')} 
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                view === 'yearly' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yearly
            </button>
          </div>
          
          {view === 'monthly' && (
            <select 
              value={month} 
              onChange={e => setMonth(e.target.value)} 
              className="input w-auto"
            >
              {fyMonths.map(m => <option key={m} value={m}>{getMonthLabel(m)}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-100 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="card p-12 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      ) : (
        view === 'monthly' && data?.summary ? renderMonthly() :
        view === 'yearly'  && data?.months  ? renderYearly()  : null
      )}

      {monthPickerOpen && (
        <MonthPicker months={fyMonths} selected={month} onChange={m => monthPickerCb && monthPickerCb(m)} onClose={() => { setMonthPickerOpen(false); setMonthPickerCb(null); }} />
      )}
    </div>
  );
}
