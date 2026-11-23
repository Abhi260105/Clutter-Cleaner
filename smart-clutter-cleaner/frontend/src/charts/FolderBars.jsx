import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { reducedMotion } from '../utils/motion.js';
import ChartTooltip from '../components/ChartTooltip.jsx';
import { formatBytes } from '../utils/format.js';

// Horizontal bars of the heaviest folders.
export default function FolderBars({ data }) {
  if (!data.length) return <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">No scan data yet.</p>;
  const sorted = [...data].sort((a, b) => b.size - a.size).slice(0, 8);

  return (
    <div className="h-64">
      <ResponsiveContainer>
        <BarChart data={sorted} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-white/10" />
          <XAxis type="number" tickFormatter={(v) => formatBytes(v, 0)} tick={{ fontSize: 11 }} className="fill-slate-400" axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={84} tick={{ fontSize: 12 }} className="fill-slate-600 dark:fill-slate-300" axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: 'rgba(124,58,237,0.06)' }} content={<ChartTooltip valueFormat={(v) => formatBytes(v)} />} />
          <Bar dataKey="size" radius={[0, 8, 8, 0]} barSize={18} isAnimationActive={!reducedMotion} animationDuration={900}>
            {sorted.map((_, i) => (
              <Cell key={i} fill={i % 2 ? '#06b6d4' : '#7c3aed'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
