import { useState } from 'react';
import { formatINR } from '../utils/formatUtils';
import { truncateNote } from '../utils/formatUtils';
import ConfirmDialog from './ConfirmDialog';

export default function TransactionList({ transactions, onEdit, onDelete }) {
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [confirmId, setConfirmId] = useState(null);

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  const sorted = [...transactions].sort((a, b) => {
    let av = a[sortKey], bv = b[sortKey];
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ k }) => (
    <span className="ml-1 text-xs">{sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
  );

  const th = (label, key) => (
    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 cursor-pointer select-none hover:text-gray-900" onClick={() => handleSort(key)}>
      {label}<SortIcon k={key} />
    </th>
  );

  const typeColor = { Income: 'text-income', Expense: 'text-expense', Saving: 'text-saving' };

  if (transactions.length === 0) {
    return <p className="text-center text-gray-400 py-8">No transactions found for this period.</p>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {th('Date', 'date')}
              {th('Type', 'type')}
              {th('Category', 'category')}
              {th('Subcategory', 'subcategory')}
              {th('Amount', 'amount')}
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Note</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.map(tx => (
              <tr key={tx.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap">{tx.date}</td>
                <td className={`px-3 py-2 font-medium ${typeColor[tx.type] || ''}`}>{tx.type}</td>
                <td className="px-3 py-2">{tx.category}</td>
                <td className="px-3 py-2">{tx.subcategory}</td>
                <td className="px-3 py-2 font-medium">{formatINR(tx.amount)}</td>
                <td className="px-3 py-2 text-gray-500 max-w-xs truncate" title={tx.note}>{truncateNote(tx.note)}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <button onClick={() => onEdit(tx)} className="text-accent hover:underline mr-3">Edit</button>
                  <button onClick={() => setConfirmId(tx.id)} className="text-negative hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {confirmId && (
        <ConfirmDialog
          message="Delete this transaction? This action cannot be undone."
          onConfirm={() => { onDelete(confirmId); setConfirmId(null); }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </>
  );
}
