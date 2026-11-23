import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { demoDisk, demoSummary } from '../services/demoData.js';

// Loads real disk + scan data. If the backend cannot be reached, falls back to
// clearly-labelled demo data so the UI can still be previewed.
export default function useDashboard() {
  const [state, setState] = useState({ loading: true, demo: false, error: null, disk: null, summary: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const [disk, summary] = await Promise.all([api.disk(), api.dashboardSummary()]);
      setState({ loading: false, demo: false, error: null, disk, summary });
    } catch (err) {
      setState({ loading: false, demo: true, error: err.message, disk: demoDisk, summary: demoSummary });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
