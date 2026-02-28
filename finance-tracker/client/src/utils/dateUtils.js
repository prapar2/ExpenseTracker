export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getFYStart(startMonth = 4) {
  const today = new Date();
  const yr = today.getFullYear();
  const mo = today.getMonth() + 1;
  const fyYear = mo >= startMonth ? yr : yr - 1;
  return `${fyYear}-${String(startMonth).padStart(2, '0')}`;
}

export function getFYMonths(fyStart) {
  const [yr, mo] = fyStart.split('-').map(Number);
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(yr, mo - 1 + i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

export function getMonthLabel(yyyyMM) {
  const [yr, mo] = yyyyMM.split('-').map(Number);
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${names[mo - 1]} ${yr}`;
}

export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function isElapsed(yyyyMM) {
  return yyyyMM < currentMonth();
}

export function isCurrent(yyyyMM) {
  return yyyyMM === currentMonth();
}

export function isFuture(yyyyMM) {
  return yyyyMM > currentMonth();
}

export function getFYLabel(fyStart) {
  const [yr, mo] = fyStart.split('-').map(Number);
  const endYr = mo === 1 ? yr : yr + 1;
  return `FY ${yr}-${String(endYr).slice(-2)}`;
}

export function getFYList(startMonth = 4, yearsBack = 1, yearsForward = 2) {
  const currentFYStart = getFYStart(startMonth);
  const baseYear = Number(currentFYStart.split('-')[0]);
  const list = [];
  for (let y = baseYear - yearsBack; y <= baseYear + yearsForward; y++) {
    list.push(`${y}-${String(startMonth).padStart(2, '0')}`);
  }
  return list;
}
