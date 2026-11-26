import { useState } from 'react';
import useCountUp from '../hooks/useCountUp.js';
import { formatBytes } from '../utils/format.js';

const R = 62;
const C = 2 * Math.PI * R;

// Animated ring showing used / free / total disk capacity. Hover a legend row to focus it.
export default function StorageGauge({ disk }) {
  const [focus, setFocus] = useState(null);
  const pct = useCountUp(disk.percent);
  const usedStroke = (Math.min(100, pct) / 100) * C;

  const rows = [
    { key: 'used', label: 'Used', value: disk.used, dot: 'bg-violet-500' },
    { key: 'free', label: 'Available', value: disk.free, dot: 'bg-cyan-400' },
    { key: 'total', label: 'Total capacity', value: disk.total, dot: 'bg-slate-300 dark:bg-slate-600' },
  ];

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative h-44 w-44 shrink-0">
        <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
          <defs>
            <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
          <circle cx="80" cy="80" r={R} fill="none" strokeWidth="14" className="stroke-slate-100 dark:stroke-white/10" />
          <circle
            cx="80" cy="80" r={R} fill="none" strokeWidth="14" strokeLinecap="round"
            stroke="url(#gaugeGrad)" strokeDasharray={`${usedStroke} ${C}`}
            className={`transition-opacity duration-200 ${focus === 'free' ? 'opacity-30' : 'opacity-100'}`}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{pct.toFixed(0)}%</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">of disk used</p>
          </div>
        </div>
      </div>

      <ul className="w-full space-y-2">
        {rows.map((r) => (
          <li
            key={r.key}
            onMouseEnter={() => setFocus(r.key)}
            onMouseLeave={() => setFocus(null)}
            className={`flex items-center justify-between rounded-xl px-3 py-2 transition-colors ${
              focus === r.key ? 'bg-slate-100 dark:bg-white/10' : ''
            }`}
          >
            <span className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <span className={`h-2.5 w-2.5 rounded-full ${r.dot}`} /> {r.label}
            </span>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">{formatBytes(r.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
