import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { reducedMotion } from '../utils/motion.js';
import ChartTooltip from '../components/ChartTooltip.jsx';
import { formatBytes, formatNumber } from '../utils/format.js';

const RANGES = [
  { id: 7, label: '7d' },
  { id: 30, label: '30d' },
  { id: 0, label: 'All' },
];

const shortDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '');

// One chart, two views: files cleaned per day, or cumulative storage recovered.
export default function CleanupTrend({ history, recovery }) {
  const [view, setView] = useState('history');
  const [range, setRange] = useState(30);

  const cut = (rows) => {
    if (!range) return rows;
    const since = Date.now() - range * 86400e3;
    return rows.filter((r) => new Date(r.date).getTime() >= since);
  };
  const hist = useMemo(() => cut(history), [history, range]);
  const rec = useMemo(() => cut(recovery), [recovery, range]);
  const rows = view === 'history' ? hist : rec;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/5">
          {[['history', 'Cleanup history'], ['recovery', 'Storage recovered']].map(([id, label]) => (
            <button
              key={id} onClick={() => setView(id)}
              className={`chip ${view === id ? 'bg-white text-violet-600 shadow-sm dark:bg-navy-700 dark:text-violet-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.id} onClick={() => setRange(r.id)}
              className={`chip ${range === r.id ? 'bg-violet-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-14 text-center text-sm text-slate-500 dark:text-slate-400">Nothing cleaned in this period yet.</p>
      ) : (
        <div className="h-56">
          <ResponsiveContainer>
            {view === 'history' ? (
              <BarChart data={rows} margin={{ left: -12, right: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-white/10" />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} className="fill-slate-500" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} className="fill-slate-400" axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'rgba(124,58,237,0.06)' }} content={<ChartTooltip valueFormat={(v, p) => `${formatNumber(v)} files · ${formatBytes(p.payload.bytes)}`} />} />
                <Bar dataKey="files" fill="#7c3aed" radius={[6, 6, 0, 0]} isAnimationActive={!reducedMotion} animationDuration={800} />
              </BarChart>
            ) : (
              <AreaChart data={rows} margin={{ left: -4, right: 8 }}>
                <defs>
                  <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-white/10" />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} className="fill-slate-500" axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => formatBytes(v, 0)} tick={{ fontSize: 11 }} className="fill-slate-400" axisLine={false} tickLine={false} width={56} />
                <Tooltip content={<ChartTooltip valueFormat={(v) => `${formatBytes(v)} recovered`} />} />
                <Area dataKey="cumulative" stroke="#06b6d4" strokeWidth={2.5} fill="url(#recGrad)" isAnimationActive={!reducedMotion} animationDuration={900} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
