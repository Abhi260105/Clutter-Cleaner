
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, AlertCircle, RefreshCw, FileSearch } from "lucide-react";
import { api } from "../services/api";

const FEATURES = {
  large: {
    title: "Large Files",
    description: "Find files that consume significant storage space.",
    icon: "📦",
    method: "getLargeFiles",
  },
  old: {
    title: "Old Files",
    description: "Find files that have not been modified recently.",
    icon: "📅",
    method: "getOldFiles",
  },
  duplicate: {
    title: "Duplicate Files",
    description: "Find files with identical content.",
    icon: "📑",
    method: "getDuplicateFiles",
  },
  similar: {
    title: "Similar Files",
    description: "Find files with similar names or content.",
    icon: "🔍",
    method: "getSimilarFiles",
  },
};

export default function FeaturePage({ type }) {
  const navigate = useNavigate();
  const [folderPath, setFolderPath] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scanned, setScanned] = useState(false);

  const feature = FEATURES[type];

  if (!feature) {
    return <div className="p-6">Invalid feature selected.</div>;
  }

  const handleScan = async () => {
    if (!folderPath.trim()) {
      setError("Please enter a folder path.");
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);
    setScanned(false);

    try {
      // This API method must exist in api.js and match a backend route.
      const scanMethod = api[feature.method];

      if (typeof scanMethod !== "function") {
        throw new Error(
          `API method "${feature.method}" is not available. Check api.js and your backend routes.`
        );
      }

      const response = await scanMethod(folderPath.trim());

      // Accept common response formats from the backend.
      const files = Array.isArray(response)
        ? response
        : response.files || response.results || [];

      setResults(files);
      setScanned(true);
    } catch (err) {
      setError(err.message || "Unable to scan the selected folder.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-violet-600 dark:text-slate-300"
        >
          <ArrowLeft size={18} />
          Go Back
        </button>

        <div className="mb-8">
          <div className="mb-3 text-4xl">{feature.icon}</div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {feature.title}
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            {feature.description}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Folder Path
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="Example: C:\Users\YourName\Downloads"
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />

            <button
              onClick={handleScan}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Search size={18} />
                  Scan Folder
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              <AlertCircle size={18} className="shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Scan Results
            </h2>
            <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
              {results.length} files
            </span>
          </div>

          {loading ? (
            <p className="py-10 text-center text-slate-500">
              Scanning folder...
            </p>
          ) : results.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
                    <th className="p-3">File Name</th>
                    <th className="p-3">Path</th>
                    <th className="p-3">Size</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((file, index) => (
                    <tr
                      key={file.id || file.path || index}
                      className="border-b border-slate-100 dark:border-slate-800"
                    >
                      <td className="p-3 font-medium text-slate-800 dark:text-white">
                        {file.name || file.filename || "Unknown"}
                      </td>
                      <td className="max-w-xs truncate p-3 text-slate-500">
                        {file.path || file.file_path || "-"}
                      </td>
                      <td className="p-3 text-slate-500">
                        {file.size || file.size_bytes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <FileSearch
                size={42}
                className="mx-auto mb-3 text-slate-400"
              />
              <p className="font-medium text-slate-600 dark:text-slate-300">
                {scanned ? "No matching files found." : "No scan results yet."}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Enter a folder path and start scanning.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
