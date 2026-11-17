const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateString(value) {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

export function addRepeat(dateString, repeat) {
  const base = isDateString(dateString) ? dateString : todayUtc();
  const date = new Date(`${base}T00:00:00Z`);
  const every = Math.max(1, Math.floor(Number(repeat?.every) || 1));
  const unit = repeat?.unit;

  if (unit === "day") {
    date.setUTCDate(date.getUTCDate() + every);
  } else if (unit === "week") {
    date.setUTCDate(date.getUTCDate() + every * 7);
  } else if (unit === "month") {
    const day = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + every);
    const days = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(day, days));
  } else if (unit === "year") {
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCFullYear(date.getUTCFullYear() + every);
    date.setUTCMonth(month);
    const days = new Date(Date.UTC(date.getUTCFullYear(), month + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(day, days));
  } else {
    return base;
  }

  return date.toISOString().slice(0, 10);
}
