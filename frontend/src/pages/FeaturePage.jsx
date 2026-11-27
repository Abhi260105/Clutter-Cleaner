import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, ArrowLeft, FileSearch, FolderSearch, RefreshCw, Search,
  ShieldCheck, Sparkles,
} from 'lucide-react';
import { api, errorMessage } from '../services/api.js';

const FEATURES = {
  '/duplicates': {
    title: 'Duplicates', description: 'Find files with identical content using SHA-256 checksums.',
    icon: '📑', kind: 'duplicates',
  },
  '/large-files': {
    title: 'Large Files', description: 'Review the largest files found in your selected folder.',
    icon: '📦', kind: 'large',
  },
  '/downloads': {
    title: 'Old Downloads', description: 'Find older files detected inside Downloads folders.',
    icon: '📅', kind: 'old',
  },
  '/similar': {
    title: 'Similar Files', description: 'Find files grouped by matching filename stems.',
    icon: '🔍', kind: 'similar',
  },
  '/cleanup': {
    title: 'Cleanup Center', description: 'Review large, old-download and temporary files before taking action.',
    icon: '✨', kind: 'cleanup',
  },
};

function formatBytes(value = 0) {
  const bytes = Number(value) || 0;
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = bytes / 1024;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(2)} ${units[index]}`;
}

function getRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.files)) return payload.files;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

export default function FeaturePage({ featurePath }) {
  const navigate = useNavigate();
  const feature = FEATURES[featurePath];
  const [folderPath, setFolderPath] = useState('');
  const [results, setResults] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [scanned, setScanned] = useState(false);

  if (!feature) {
    return <div className="card p-6">This feature route is not configured.</div>;
  }

  async function handleScan(event) {
    event.preventDefault();
    if (!folderPath.trim()) {
      setError('Enter a folder path before scanning.');
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');
    setResults([]);
    setGroups([]);
    setScanned(false);

    try {
      // Run the real scanner first; feature endpoints operate on its latest completed scan.
      const scan = await api.startScan(folderPath.trim());
      if (scan?.status !== 'completed') {
        throw new Error(scan?.message || 'The folder scan did not complete successfully.');
      }

      if (feature.kind === 'duplicates') {
        await api.analyzeDuplicates();
        const duplicateData = await api.getDuplicates();
        const duplicateGroups = Array.isArray(duplicateData?.groups) ? duplicateData.groups : [];
        setGroups(duplicateGroups);
        setResults(duplicateGroups.flatMap((group) =>
          (group.files || []).map((file) => ({ ...file, duplicate_group_id: group.id,
            duplicate_file_count: group.file_count, reclaimable_size: group.reclaimable_size }))
        ));
      } else {
        const data = await api.discoverFiles(feature.kind);
        setResults(getRows(data));
      }
      setScanned(true);
      setNotice(`Scan completed: ${Number(scan.total_files || 0).toLocaleString()} files checked.`);
    } catch (err) {
      setError(errorMessage(err, 'Unable to scan this folder.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleQuarantine(file) {
    if (!file?.id) return;
    const confirmed = window.confirm(`Move this file to ClutterCleaner quarantine?\n\n${file.path}`);
    if (!confirmed) return;

    setActingId(file.id);
    setError('');
    setNotice('');
    try {
      await api.quarantineFile(file.id, feature.kind);
      setResults((current) => current.filter((item) => item.id !== file.id));
      setGroups((current) => current.map((group) => ({
        ...group,
        files: (group.files || []).filter((item) => item.id !== file.id),
      })).filter((group) => group.files.length > 1));
      setNotice('File moved to quarantine. You can restore it from the Quarantine page.');
    } catch (err) {
      setError(errorMessage(err, 'Unable to quarantine this file.'));
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-violet-600">
          <ArrowLeft size={17} /> Go back
        </button>
        <div className="flex items-start gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-violet-100 text-3xl dark:bg-violet-500/15">{feature.icon}</div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-violet-600">File discovery</p>
            <h1 className="mt-1 text-2xl font-bold">{feature.title}</h1>
            <p className="mt-2 text-sm text-slate-500">{feature.description}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleScan} className="card space-y-4 p-5">
        <label htmlFor="feature-folder-path" className="block text-sm font-semibold">Folder path</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="feature-folder-path"
            value={folderPath}
            onChange={(event) => setFolderPath(event.target.value)}
            placeholder={'Example: C:\Users\YourName\Downloads'}
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-transparent px-4 py-3 text-sm outline-none focus:border-violet-500 dark:border-white/10"
            required
          />
          <button type="submit" disabled={loading || !folderPath.trim()} className="btn-primary inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? <RefreshCw size={17} className="animate-spin" /> : <FolderSearch size={17} />}
            {loading ? 'Scanning…' : 'Scan folder'}
          </button>
        </div>
        <p className="text-xs text-slate-500">This runs a new scan of the selected folder and its supported subfolders. Scanning does not delete files.</p>
        {notice && <p role="status" className="text-sm text-emerald-600">{notice}</p>}
        {error && <p role="alert" className="flex items-start gap-2 text-sm text-red-600"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</p>}
      </form>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 dark:border-white/10">
          <div>
            <h2 className="font-semibold">{feature.title} results</h2>
            <p className="mt-1 text-xs text-slate-500">{scanned ? 'Results from the latest completed scan.' : 'Run a scan to load results.'}</p>
          </div>
          <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">{feature.kind === 'duplicates' ? groups.length : results.length} {feature.kind === 'duplicates' ? 'groups' : 'files'}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 p-12 text-sm text-slate-500"><RefreshCw size={18} className="animate-spin" />Scanning folder and loading results…</div>
        ) : feature.kind === 'duplicates' && groups.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-white/10">
            {groups.map((group) => (
              <div key={group.id} className="space-y-3 p-5">
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <strong>{group.file_count} identical files</strong>
                  <span className="text-emerald-600">Potential savings: {formatBytes(group.reclaimable_size)}</span>
                </div>
                {(group.files || []).map((file) => (
                  <div key={file.id} className="flex flex-col justify-between gap-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/5 sm:flex-row sm:items-center">
                    <div className="min-w-0"><p className="truncate font-medium">{file.name}</p><p className="break-all text-xs text-slate-500">{file.path}</p><p className="mt-1 text-xs text-slate-500">{formatBytes(file.size)}</p></div>
                    <button type="button" onClick={() => handleQuarantine(file)} disabled={actingId === file.id} className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50 dark:border-amber-400/30 dark:text-amber-300">{actingId === file.id ? 'Moving…' : 'Quarantine file'}</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-white/5">
                <tr><th className="p-3">File</th><th className="p-3">Size</th><th className="p-3">Modified</th><th className="p-3">Action</th></tr>
              </thead>
              <tbody>
                {results.map((file) => (
                  <tr key={file.id || file.path} className="border-t border-slate-100 dark:border-white/10">
                    <td className="max-w-lg p-3"><p className="truncate font-medium">{file.name || 'Unknown file'}</p><p className="break-all text-xs text-slate-500">{file.path || 'Path unavailable'}</p></td>
                    <td className="whitespace-nowrap p-3">{formatBytes(file.size)}</td>
                    <td className="whitespace-nowrap p-3 text-slate-500">{file.modified_at ? new Date(file.modified_at).toLocaleDateString() : '—'}</td>
                    <td className="p-3"><button type="button" onClick={() => handleQuarantine(file)} disabled={!file.id || actingId === file.id} className="inline-flex items-center gap-1 rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50 dark:border-amber-400/30 dark:text-amber-300"><ShieldCheck size={14} />{actingId === file.id ? 'Moving…' : 'Quarantine'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            {scanned ? <Sparkles size={36} className="mx-auto mb-3 text-emerald-500" /> : <FileSearch size={36} className="mx-auto mb-3 text-slate-400" />}
            <p className="font-medium">{scanned ? 'No matching files found.' : 'No results yet'}</p>
            <p className="mt-1 text-sm text-slate-500">{scanned ? 'Try another folder or review the scan thresholds.' : 'Enter a folder path above and start scanning.'}</p>
          </div>
        )}
      </section>
    </div>
  );
}
