import { getMonthLabel } from '../utils/dateUtils';

export default function MonthPicker({ months, selected, onChange, onClose, showEntireFY = false }) {
  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-accent px-6 py-4">
          <h3 className="text-lg font-semibold text-white">Select Month</h3>
          <p className="text-white/80 text-sm">Choose a month to view details</p>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-3 gap-3">
            {showEntireFY && (
              <button
                onClick={() => { onChange(null); onClose(); }}
                className="col-span-3 py-3 px-4 rounded-xl text-sm font-medium transition-all bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
              >
                Entire FY
              </button>
            )}
            {months.map(m => {
              const isSelected = m === selected;
              return (
                <button
                  key={m}
                  onClick={() => { onChange(m); onClose(); }}
                  className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-accent text-white shadow-md'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {getMonthLabel(m)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4">
          <button 
            onClick={onClose} 
            className="w-full btn-ghost"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
