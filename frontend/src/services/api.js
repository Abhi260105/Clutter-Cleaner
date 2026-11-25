import { useState } from 'react';
import { FolderOpen, ScanSearch } from 'lucide-react';
import { api } from '../services/api.js';

function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(2)} ${units[index]}`;
}

export default function Scanner() {
  const [folder, setFolder] = useState('');
  const [scan, setScan] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [choosingFolder, setChoosingFolder] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function handleBrowse() {
    setChoosingFolder(true);
    setError('');
    setNotice('');
    try {
      const result = await api.selectFolder();
      if (result.cancelled) {
        setNotice('Folder selection cancelled. You can enter a path manually.');
      } else {
        setFolder(result.folder_path);
        setNotice('Folder selected. You can start scanning now.');
      }
    } catch (err) {
      setError(err.message || 'Unable to open the folder picker. Enter the path manually.');
    } finally {
      setChoosingFolder(false);
    }
  }

  async function handleScan(event) {
    event.preventDefault();
    if (!folder.trim()) return;

    setLoading(true);
    setError('');
    setNotice('');
    setScan(null);
    setFiles([]);
    try {
      const result = await api.startScan(folder.trim());
      setScan(result);
      const fileRows = await api.scanFiles(result.id, 100, 0);
      setFiles(fileRows);
    } catch (err) {
      setError(err.message || 'Unable to scan this folder.');
    } finally {
      setLoading(false);
    }
  }

  const stats = scan ? [
    ['Files scanned', scan.total_files.toLocaleString()],
    ['Total size', formatBytes(scan.total_size)],
    ['Large files', scan.large_files.toLocaleString()],
    ['Old Downloads', (scan.old_downloads ?? 0).toLocaleString()],
    ['Temporary files', (scan.temporary_files ?? 0).toLocaleString()],
    ['Read errors', scan.error_count.toLocaleString()],
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-violet-600">FILE MANAGEMENT</p>
        <h1 className="mt-1 text-2xl font-bold">Smart Scanner</h1>
        <p className="mt-2 text-sm text-slate-500">
          Choose a folder manually or browse for it. The scanner checks files and subfolders without deleting or changing anything.
        </p>
      </div>

      <form onSubmit={handleScan} className="card space-y-4 p-5">
        <label className="block text-sm font-semibold" htmlFor="folder-path">Folder path</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="folder-path"
            value={folder}
            onChange={(event) => setFolder(event.target.value)}
            placeholder={'Example: C:\\Users\\YourName\\Downloads'}
            required
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-transparent px-4 py-3 text-sm outline-none focus:border-violet-500"
          />
          <button
            type="button"
            onClick={handleBrowse}
            disabled={choosingFolder || loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-300 px-4 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-400/30 dark:text-violet-300 dark:hover:bg-violet-400/10"
          >
            <FolderOpen size={17} />
            {choosingFolder ? 'Opening…' : 'Browse folder'}
          </button>
        </div>
        <button
          type="submit"
          disabled={loading || choosingFolder || !folder.trim()}
          className="btn-primary inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ScanSearch size={17} />
          {loading ? 'Scanning folder…' : 'Start Scan'}
        </button>
        {notice && <p role="status" className="text-sm text-emerald-600">{notice}</p>}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </form>

      {scan && <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map(([label, value]) => (
            <div className="card p-5" key={label}>
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-slate-200 p-5 dark:border-white/10">
            <h2 className="font-semibold">Largest files (first 100)</h2>
            <p className="mt-1 break-all text-xs text-slate-500">Scanned folder: {scan.root_path}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 dark:bg-white/5">
                <tr>
                  <th className="p-3">File</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Size</th>
                  <th className="p-3">Flags</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id} className="border-t border-slate-100 dark:border-white/10">
                    <td className="max-w-xs p-3">
                      <p className="truncate font-medium">{file.name}</p>
                      <p className="truncate text-xs text-slate-500" title={file.path}>{file.path}</p>
                    </td>
                    <td className="p-3 capitalize">{file.category}</td>
                    <td className="whitespace-nowrap p-3">{formatBytes(file.size)}</td>
                    <td className="p-3">
                      {[file.is_large && 'Large', file.is_old_download && 'Old download', file.is_temp && 'Temporary'].filter(Boolean).join(', ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {files.length === 0 && <p className="p-5 text-sm text-slate-500">No files found in this folder.</p>}
        </div>
      </>}
    </div>
  );
}
