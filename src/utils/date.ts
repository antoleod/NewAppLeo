export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function toDate(value?: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function startOfDay(date = new Date()) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function isSameDay(left: string | Date, right: string | Date) {
  const a = toDate(left);
  const b = toDate(right);
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatShortDate(value: string | Date) {
  const date = toDate(value);
  if (!date) return 'Unknown date';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
}

export function formatLongDate(value: string | Date) {
  const date = toDate(value);
  if (!date) return 'Unknown date';
  return new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(date);
}

export function formatDateTime(value: string | Date) {
  const date = toDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

export function formatTime(value: string | Date) {
  const date = toDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function formatDuration(minutes: number) {
  const total = Math.max(0, Math.round(minutes || 0));
  const hours = Math.floor(total / 60);
  const remainder = total % 60;
  if (hours > 0) {
    return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
  }
  return `${remainder}m`;
}

export function formatDaysAgo(value: string | Date) {
  const date = toDate(value);
  if (!date) return '';
  const diff = Math.floor((startOfDay(new Date()).getTime() - startOfDay(date).getTime()) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${diff} days ago`;
}

export function dateKey(value: string | Date) {
  const date = toDate(value);
  if (!date) return 'invalid';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function subtractDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - days);
  return copy;
}
