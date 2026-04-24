import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatINR } from '../utils/formatUtils';

const DONUT_COLORS = {
  Income:  ['#1B3A6B','#2E75B6','#5B9BD5','#7B68EE','#6A5ACD','#9370DB','#8A63D2','#B0A0E0'],
  Expense: ['#B03030','#D04040','#8B4513','#A0522D','#CD853F','#B8860B','#D4A017','#C06030'],
  Saving:  ['#1A6B3A','#2E8B57','#3CB371','#66CDAA','#DB7093','#C71585','#E075A0','#50C878'],
};
const TYPES = ['Income', 'Expense', 'Saving'];

export default function SpendingBreakdown({ budgetVsActual, title = 'Spending Breakdown' }) {
  const [donutType, setDonutType] = useState('Expense');
  const [donutDrill, setDonutDrill] = useState(null);

  const donutRaw = budgetVsActual.filter(r => r.type === donutType);
  const donutByCat = {};
  for (const r of donutRaw) donutByCat[r.category] = (donutByCat[r.category] || 0) + r.actual;
  const donutData = Object.entries(donutByCat).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  const donutSubData = donutDrill ? donutRaw.filter(r => r.category === donutDrill).map(r => ({ name: r.subcategory, value: r.actual })).filter(d => d.value > 0) : [];
  const activeDonut = donutDrill ? donutSubData : donutData;
  const colors = DONUT_COLORS[donutType];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">{donutDrill ? `${donutDrill} Breakdown` : title}</h3>
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
          <p className="text-gray-400">No {donutType} data available.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={activeDonut}
              cx="35%"
              cy="50%"
              innerRadius={80}
              outerRadius={120}
              dataKey="value"
              nameKey="name"
              onClick={(e) => { if (!donutDrill) setDonutDrill(e.name); }}
              paddingAngle={2}
            >
              {activeDonut.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => formatINR(v)} />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              wrapperStyle={{ fontSize: '12px', lineHeight: '24px', right: 0, maxWidth: '40%' }}
              formatter={(value) => <span className="text-gray-600">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
