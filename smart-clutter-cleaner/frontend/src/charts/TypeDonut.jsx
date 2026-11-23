import { useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { reducedMotion } from '../utils/motion.js';
import ChartTooltip from '../components/ChartTooltip.jsx';
import { TYPE_COLORS, formatBytes, formatNumber } from '../utils/format.js';

// Storage by file type. Click legend items to hide/show a type; the centre total updates.
export default function TypeDonut({ data }) {
  const [hidden, setHidden] = useState([]);
  const [active, setActive] = useState(null);

  const visible = useMemo(() => data.filter((d) => !hidden.includes(d.name)), [data, hidden]);
  const total = visible.reduce((s, d) => s + d.size, 0);
  const toggle = (name) => setHidden((h) => (h.includes(name) ? h.filter((x) => x !== name) : [...h, name]));

  if (!data.length) return <Empty />;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-52 w-52 shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={visible} dataKey="size" nameKey="name" innerRadius={62} outerRadius={92}
              paddingAngle={3} cornerRadius={6} stroke="none" isAnimationActive={!reducedMotion}
              onMouseEnter={(_, i) => setActive(i)} onMouseLeave={() => setActive(null)}
            >
              {visible.map((d, i) => (
                <Cell key={d.name} fill={TYPE_COLORS[d.name] || TYPE_COLORS.other} opacity={active === null || active === i ? 1 : 0.35} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip valueFormat={(v) => formatBytes(v)} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{formatBytes(total)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{hidden.length ? 'selected' : 'scanned'}</p>
          </div>
        </div>
      </div>

      <ul className="w-full space-y-1">
        {data.map((d) => {
          const off = hidden.includes(d.name);
          return (
            <li key={d.name}>
              <button
                onClick={() => toggle(d.name)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-sm transition hover:bg-slate-100 dark:hover:bg-white/10 ${off ? 'opacity-40' : ''}`}
              >
                <span className="flex items-center gap-2 capitalize text-slate-700 dark:text-slate-200">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: TYPE_COLORS[d.name] || TYPE_COLORS.other }} />
                  {d.name}
                  <span className="text-xs text-slate-400">{formatNumber(d.count)}</span>
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatBytes(d.size)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Empty() {
  return <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">No scan data yet.</p>;
}
