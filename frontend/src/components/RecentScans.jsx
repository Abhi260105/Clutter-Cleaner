import { CheckCircle2, Loader2, PauseCircle, XCircle, AlertTriangle } from 'lucide-react';
import { formatBytes, formatNumber, timeAgo } from '../utils/format.js';

const STATUS = {
  completed: { icon: CheckCircle2, cls: 'text-emerald-500', label: 'Completed' },
  running: { icon: Loader2, cls: 'animate-spin text-violet-500', label: 'Running' },
  paused: { icon: PauseCircle, cls: 'text-amber-500', label: 'Paused' },
  cancelled: { icon: XCircle, cls: 'text-slate-400', label: 'Cancelled' },
  failed: { icon: AlertTriangle, cls: 'text-rose-500', label: 'Failed' },
};

export default function RecentScans({ scans }) {
  if (!scans.length) {
    return <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No scans yet. Start one to see activity here.</p>;
  }
  return (
    <ul className="divide-y divide-slate-100 dark:divide-white/5">
      {scans.map((s) => {
        const st = STATUS[s.status] || STATUS.completed;
        const Icon = st.icon;
        return (
          <li key={s.id} className="flex items-center gap-3 py-3">
            <Icon size={18} className={st.cls} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{(s.roots || []).join(', ') || `Scan #${s.id}`}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {st.label} · {formatNumber(s.total_files)} files · {formatBytes(s.total_size)}
              </p>
            </div>
            <span className="shrink-0 text-xs text-slate-400">{timeAgo(s.started_at)}</span>
          </li>
        );
      })}
    </ul>
  );
}
