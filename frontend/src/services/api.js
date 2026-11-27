// Central API client for the Smart Digital Clutter Cleaner frontend.
//
// BASE is empty by default, so requests go to the same origin as the Vite dev
// server. That requires a proxy for "/api" -> http://localhost:8000 in
// vite.config.js, or set VITE_API_URL=http://localhost:8000 in .env.

const BASE = import.meta.env.VITE_API_URL || '';

const DEFAULT_TIMEOUT_MS = 30_000;
const SCAN_TIMEOUT_MS = 10 * 60_000; // scanning a large folder can take minutes
const DIALOG_TIMEOUT_MS = 10 * 60_000; // user may leave the native dialog open

export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status; // 0 = no response (network failure or timeout)
    this.data = data;
  }

  get isNetworkError() {
    return this.status === 0;
  }
}

// FastAPI returns `detail` as a string for HTTPException and as an array of
// objects for 422 validation errors. Always turn it into readable text.
function formatDetail(detail, fallback) {
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        const field = Array.isArray(d.loc) ? d.loc.slice(1).join('.') : '';
        return field ? `${field}: ${d.msg}` : d.msg;
      })
      .join('; ');
  }
  if (typeof detail === 'object' && detail.message) return detail.message;
  return fallback;
}

async function request(path, { timeout = DEFAULT_TIMEOUT_MS, headers, ...options } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...headers },
      signal: controller.signal,
    });
  } catch (e) {
    throw new ApiError(
      e.name === 'AbortError'
        ? 'The request timed out. The backend may be busy or not responding.'
        : 'Backend is not reachable. Check whether it is running on port 8000.',
      0
    );
  } finally {
    clearTimeout(timer);
  }

  // Read the body as text first so empty (204) and non-JSON responses
  // never crash the app.
  let data = null;
  try {
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
  } catch {
    // Body could not be read; treat as empty.
  }

  if (!res.ok) {
    const fallback = res.statusText || `Request failed (HTTP ${res.status})`;
    const detail =
      data && typeof data === 'object' ? formatDetail(data.detail, fallback) : fallback;
    throw new ApiError(detail, res.status, data);
  }

  return data; // null when the response body is empty
}

function query(params) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') qs.set(key, String(value));
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
}

// Helper for components: turns any thrown value into a message for the UI.
export function errorMessage(err, fallback = 'Something went wrong.') {
  if (err instanceof ApiError) return err.message;
  return err?.message || fallback;
}

export const api = {
  health: () => request('/api/health'),
  disk: () => request('/api/system/disk'),
  dashboardSummary: () => request('/api/dashboard/summary'),

  // Opens the native folder-selection dialog on the machine running the backend.
  selectFolder: () => request('/api/scans/select-folder', { timeout: DIALOG_TIMEOUT_MS }),

  // Starts scanning the selected folder.
  startScan: (folder_path) =>
    request('/api/scans', {
      method: 'POST',
      body: JSON.stringify({ folder_path }),
      timeout: SCAN_TIMEOUT_MS,
    }),

  scanFiles: (scanId, limit = 100, offset = 0) =>
    request(`/api/scans/${encodeURIComponent(scanId)}/files${query({ limit, offset })}`),

  // Feature discovery always reads the latest completed scan in the backend.
  discoverFiles: (kind) => request(`/api/features/files/${encodeURIComponent(kind)}`),
  analyzeDuplicates: () =>
    request('/api/features/duplicates/analyze', { method: 'POST' }),
  getDuplicates: () => request('/api/features/duplicates'),
  quarantineFile: (file_id, reason = 'manual') =>
    request('/api/features/quarantine', {
      method: 'POST',
      body: JSON.stringify({ file_id, reason }),
    }),
  listQuarantine: () => request('/api/features/quarantine'),
  restoreQuarantine: (id) =>
    request(`/api/features/quarantine/${encodeURIComponent(id)}/restore`, { method: 'POST' }),
  getHistory: () => request('/api/features/history'),
  getAnalytics: () => request('/api/features/analytics'),
};
