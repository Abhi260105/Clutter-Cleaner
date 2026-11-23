// Sample data shown ONLY when the backend is unreachable, so the UI can be previewed.
// The dashboard displays a visible "Demo data" banner whenever this is in use.
const GB = 1024 ** 3;
const MB = 1024 ** 2;

const days = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const cleaned = [3, 0, 5, 2, 8, 0, 4, 6, 1, 9, 3, 7];
let running = 0;

export const demoDisk = { total: 512 * GB, used: 318 * GB, free: 194 * GB, percent: 62.1 };

export const demoSummary = {
  has_scan: true,
  total_files: 48213,
  duplicate_files: 1284,
  large_files: 37,
  potential_savings: 21.4 * GB,
  by_type: [
    { name: 'documents', size: 18 * GB, count: 9120 },
    { name: 'images', size: 41 * GB, count: 22310 },
    { name: 'videos', size: 96 * GB, count: 412 },
    { name: 'audio', size: 12 * GB, count: 3011 },
    { name: 'archives', size: 27 * GB, count: 640 },
    { name: 'other', size: 9 * GB, count: 12720 },
  ],
  by_folder: [
    { name: 'Videos', size: 88 * GB },
    { name: 'Pictures', size: 44 * GB },
    { name: 'Downloads', size: 31 * GB },
    { name: 'Documents', size: 22 * GB },
    { name: 'Music', size: 12 * GB },
    { name: 'Desktop', size: 6 * GB },
  ],
  large_distribution: [
    { bucket: '< 1 MB', count: 31200 },
    { bucket: '1–10 MB', count: 12400 },
    { bucket: '10–100 MB', count: 3900 },
    { bucket: '100 MB–1 GB', count: 676 },
    { bucket: '> 1 GB', count: 37 },
  ],
  cleanup_history: cleaned.map((files, i) => ({ date: days(cleaned.length - i), files, bytes: files * 420 * MB })),
  recovery: cleaned.map((files, i) => {
    running += files * 420 * MB;
    return { date: days(cleaned.length - i), cumulative: running };
  }),
  recent_scans: [
    { id: 3, status: 'completed', total_files: 48213, total_size: 203 * GB, started_at: new Date(Date.now() - 3600e3).toISOString(), roots: ['C:/Users/you'] },
    { id: 2, status: 'completed', total_files: 47890, total_size: 199 * GB, started_at: new Date(Date.now() - 86400e3 * 3).toISOString(), roots: ['C:/Users/you/Downloads'] },
    { id: 1, status: 'cancelled', total_files: 5120, total_size: 14 * GB, started_at: new Date(Date.now() - 86400e3 * 9).toISOString(), roots: ['D:/'] },
  ],
  recommendations: [
    { id: 'dup', severity: 'high', title: 'Remove duplicate files', detail: '1,284 duplicate copies across 530 groups', size: 12.1 * GB, route: '/duplicates' },
    { id: 'old', severity: 'medium', title: 'Review old downloads', detail: '212 files untouched for 90+ days, mostly installers', size: 6.3 * GB, route: '/downloads' },
    { id: 'tmp', severity: 'low', title: 'Clear temporary files', detail: '1,904 temp files are safe to clean', size: 1.7 * GB, route: '/cleanup' },
    { id: 'big', severity: 'medium', title: 'Archive large files', detail: '37 files are over your 500 MB threshold', size: 18.4 * GB, route: '/large-files' },
  ],
};
