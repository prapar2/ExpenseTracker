export function formatINR(amount) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
}

export function formatPct(value) {
  if (value == null) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

export function truncateNote(note, max = 100) {
  if (!note) return '';
  return note.length > max ? note.slice(0, max) + '…' : note;
}
