import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronRight, X } from 'lucide-react';
import { formatBytes } from '../utils/format.js';

const SEVERITY = {
  high: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
  medium: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  low: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
};

// Suggestions only: nothing is deleted from here, "Review" opens the relevant module.
export default function Recommendations({ items }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState([]);
  const visible = items.filter((i) => !dismissed.includes(i.id));

  if (visible.length === 0) {
    return (
      <div className="grid place-items-center gap-2 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        <CheckCircle2 className="text-emerald-500" />
        {items.length === 0 ? 'Run a scan to get personalised recommendations.' : 'All caught up. No pending recommendations.'}
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {visible.map((r) => (
        <li
          key={r.id}
          className="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 p-3 transition-all hover:border-violet-200 hover:bg-violet-50/50 dark:border-white/5 dark:hover:border-violet-400/30 dark:hover:bg-white/5"
        >
          <span className={`chip shrink-0 ${SEVERITY[r.severity] || SEVERITY.low}`}>{formatBytes(r.size)}</span>
          <button onClick={() => navigate(r.route)} className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{r.title}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{r.detail}</p>
          </button>
          <button onClick={() => navigate(r.route)} className="btn-ghost hidden shrink-0 !px-2 !py-1 text-violet-600 dark:text-violet-300 sm:inline-flex" aria-label={`Review: ${r.title}`}>
            Review <ChevronRight size={14} />
          </button>
          <button
            onClick={() => setDismissed((d) => [...d, r.id])}
            className="rounded-lg p-1 text-slate-300 opacity-0 transition hover:bg-slate-100 hover:text-slate-500 group-hover:opacity-100 dark:hover:bg-white/10"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </li>
      ))}
    </ul>
  );
}
