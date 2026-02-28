import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, ReferenceLine } from 'recharts';
import KPICard from '../components/KPICard';
import ProjectionCard from '../components/ProjectionCard';
import MonthPicker from '../components/MonthPicker';
import BudgetVsActualTable from '../components/BudgetVsActualTable';
import { useDashboard } from '../hooks/useDashboard';
import { formatINR } from '../utils/formatUtils';
import { currentMonth, getFYStart, getFYMonths, getMonthLabel, isElapsed, isCurrent } from '../utils/dateUtils';

const TYPE_COLORS = { Income: '#2E75B6', Expense: '#B03030', Saving: '#1A6B3A' };
const DONUT_COLORS = ['#2E75B6','#B03030','#1A6B3A','#856404','#6B3A1B','#3A6B1B','#1B3A6B','#6B1B3A'];
const TYPES = ['Income', 'Expense', 'Saving'];

export default function Dashboard({ fyStartMonth = 4 }) {
  const nav = useNavigate();
  const fyStart = getFYStart(fyStartMonth);
  const fyMonths = getFYMonths(fyStart);
  const [view, setView] = useState('monthly');
  const [month, setMonth] = useState(currentMonth());
  const [donutType, setDonutType] = useState('Expense');
  const [donutDrill, setDonutDrill] = useState(null);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [monthPickerCb, setMonthPickerCb] = useState(null);

  const { data, loading, error } = useDashboard(view, month, fyStart);

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard label="Total Income" amount={summary.income} colorClass="text-income" onClick={() => drillTo(month, 'Income', null, null)} />
          <KPICard label="Total Expense" amount={summary.expense} colorClass="text-expense" onClick={() => drillTo(month, 'Expense', null, null)} />
          <KPICard label="Total Saving" amount={summary.saving} colorClass="text-saving" onClick={() => drillTo(month, 'Saving', null, null)} />
          <KPICard label="Net" amount={summary.net} colorClass={summary.net >= 0 ? 'text-positive' : 'text-negative'} onClick={() => drillTo(month, null, null, null)} />
        </div>
        <div className="bg-white border rounded-lg overflow-hidden">
          <h3 className="px-4 py-3 font-semibold text-primary border-b">Budget vs Actual</h3>
          <BudgetVsActualTable rows={budgetVsActual} onDrillActual={(t, c, s) => drillTo(month, t, c, s)} />
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-primary">{donutDrill ? `${donutDrill} Breakdown` : 'Spending Breakdown'}</h3>
            <div className="flex gap-2">
              {donutDrill && <button onClick={() => setDonutDrill(null)} className="text-xs text-accent hover:underline">← Back</button>}
              {TYPES.map(t => (
                <button key={t} onClick={() => { setDonutType(t); setDonutDrill(null); }}
                  className={`text-xs px-2 py-1 rounded border ${donutType === t ? 'bg-accent text-white border-accent' : 'border-gray-300 hover:bg-gray-50'}`}>{t}</button>
              ))}
            </div>
          </div>
          {activeDonut.length === 0 ? <p className="text-center text-gray-400 py-8">No {donutType} data this month.</p> : (
            <div className="flex justify-center">
              <PieChart width={400} height={280}>
                <Pie data={activeDonut} cx={200} cy={130} innerRadius={70} outerRadius={110} dataKey="value" nameKey="name"
                  onClick={(e) => { if (!donutDrill) setDonutDrill(e.name); }}>
                  {activeDonut.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatINR(v)} /><Legend />
              </PieChart>
            </div>
          )}
        </div>
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KPICard label="Income YTD" amount={ytd.income} colorClass="text-income" onClick={() => openMonthPicker(m => drillTo(m, 'Income', null, null))} />
          <KPICard label="Expense YTD" amount={ytd.expense} colorClass="text-expense" onClick={() => openMonthPicker(m => drillTo(m, 'Expense', null, null))} />
          <KPICard label="Saving YTD" amount={ytd.saving} colorClass="text-saving" onClick={() => openMonthPicker(m => drillTo(m, 'Saving', null, null))} />
          <KPICard label="Net YTD" amount={ytd.net} colorClass={ytd.net >= 0 ? 'text-positive' : 'text-negative'} onClick={() => openMonthPicker(m => drillTo(m, null, null, null))} />
          <div className="bg-white rounded-lg shadow p-4"><p className="text-xs text-gray-500 mb-1">Months Elapsed</p><p className="text-2xl font-bold">{elapsed}</p></div>
          <div className="bg-white rounded-lg shadow p-4"><p className="text-xs text-gray-500 mb-1">Months Remaining</p><p className="text-2xl font-bold">{remaining}</p></div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold text-primary mb-3">Month-by-Month Overview</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 5, left: 10 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatINR(v)} /><Legend />
              {TYPES.map(t => <Bar key={t} dataKey={t} fill={TYPE_COLORS[t]} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold text-primary mb-3">Net Balance Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={netLine} margin={{ top: 5, right: 5, bottom: 5, left: 10 }}
              onClick={() => openMonthPicker(m => drillTo(m, null, null, null))}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatINR(v)} />
              <ReferenceLine y={0} stroke="#aaa" />
              <Line type="monotone" dataKey="net" stroke="#1B3A6B" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border rounded-lg overflow-hidden">
          <h3 className="px-4 py-3 font-semibold text-primary border-b">Annual Budget vs Actual</h3>
          <BudgetVsActualTable rows={budgetVsActual} onDrillActual={(t, c, s) => openMonthPicker(m => drillTo(m, t, c, s))} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
        <div className="flex items-center gap-3">
          <div className="flex border rounded overflow-hidden">
            <button onClick={() => setView('monthly')} className={`px-3 py-1 text-sm ${view === 'monthly' ? 'bg-accent text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>Monthly</button>
            <button onClick={() => setView('yearly')} className={`px-3 py-1 text-sm ${view === 'yearly' ? 'bg-accent text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>Yearly</button>
          </div>
          {view === 'monthly' && (
            <select value={month} onChange={e => setMonth(e.target.value)} className="border rounded px-2 py-1 text-sm">
              {fyMonths.map(m => <option key={m} value={m}>{getMonthLabel(m)}</option>)}
            </select>
          )}
        </div>
      </div>
      {error && <p className="text-negative text-sm mb-4">{error}</p>}
      {loading ? <p className="text-center text-gray-400 py-16">Loading dashboard…</p> : data && (
        view === 'monthly' ? renderMonthly() : renderYearly()
      )}
      {monthPickerOpen && (
        <MonthPicker months={fyMonths} selected={month} onChange={m => monthPickerCb && monthPickerCb(m)} onClose={() => { setMonthPickerOpen(false); setMonthPickerCb(null); }} />
      )}
    </div>
  );
}
