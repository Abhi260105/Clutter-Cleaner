import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { reducedMotion } from '../utils/motion.js';
import ChartTooltip from '../components/ChartTooltip.jsx';
import { formatNumber } from '../utils/format.js';

// How many files fall into each size bucket (large-file distribution).
export default function SizeDistribution({ data }) {
  if (!data.length) return <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">No scan data yet.</p>;
  return (
    <div className="h-56">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: -12, right: 8 }}>
          <defs>
            <linearGradient id="sizeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-white/10" />
          <XAxis dataKey="bucket" interval={0} tick={{ fontSize: 11 }} className="fill-slate-500" axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} className="fill-slate-400" axisLine={false} tickLine={false} tickFormatter={formatNumber} />
          <Tooltip cursor={{ fill: 'rgba(6,182,212,0.08)' }} content={<ChartTooltip valueFormat={(v) => `${formatNumber(v)} files`} />} />
          <Bar dataKey="count" fill="url(#sizeGrad)" radius={[8, 8, 0, 0]} isAnimationActive={!reducedMotion} animationDuration={900} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
