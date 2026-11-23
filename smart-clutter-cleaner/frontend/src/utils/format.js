const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

export function formatBytes(bytes, digits = 1) {
  const n = Number(bytes) || 0;
  if (n <= 0) return '0 B';
  const i = Math.min(UNITS.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  const v = n / Math.pow(1024, i);
  return `${v.toFixed(i === 0 ? 0 : digits)} ${UNITS[i]}`;
}

export function formatNumber(n) {
  return Math.round(Number(n) || 0).toLocaleString();
}

export function timeAgo(iso) {
  if (!iso) return '—';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  return `${Math.floor(diff / 86400)} d ago`;
}

export const TYPE_COLORS = {
  documents: '#7c3aed',
  images: '#06b6d4',
  videos: '#4f46e5',
  audio: '#ec4899',
  archives: '#f59e0b',
  other: '#94a3b8',
};
