
const BASE = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, options = {}) {
  let res;

  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch (e) {
    throw new ApiError(
      'Backend is not reachable. Check whether it is running on port 8000.',
      0
    );
  }

  if (!res.ok) {
    let detail = res.statusText;

    try {
      detail = (await res.json()).detail || detail;
    } catch (e) {
      // Ignore non-JSON error responses.
    }

    throw new ApiError(detail, res.status);
  }

  return res.json();
}

export const api = {
  health: () => request('/api/health'),
  disk: () => request('/api/system/disk'),
  dashboardSummary: () => request('/api/dashboard/summary'),

  // Opens the native folder-selection dialog.
  selectFolder: () => request('/api/scans/select-folder'),

  // Starts scanning the selected folder.
  startScan: (folder_path) =>
    request('/api/scans', {
      method: 'POST',
      body: JSON.stringify({ folder_path }),
    }),

  scanFiles: (scanId, limit = 100, offset = 0) =>
    request(`/api/scans/${scanId}/files?limit=${limit}&offset=${offset}`),
};
