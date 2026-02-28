import { getMonthLabel } from '../utils/dateUtils';

export default function MonthPicker({ months, selected, onChange, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-semibold text-primary mb-4">Select Month</h3>
        <div className="grid grid-cols-3 gap-2">
          {months.map(m => (
            <button
              key={m}
              onClick={() => { onChange(m); onClose(); }}
              className={`py-2 px-3 rounded text-sm border ${m === selected ? 'bg-accent text-white border-accent' : 'border-gray-300 hover:bg-gray-50'}`}
            >
              {getMonthLabel(m)}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 w-full py-2 border border-gray-300 rounded hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </div>
  );
}
