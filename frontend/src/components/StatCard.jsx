import { ArrowUpRight } from 'lucide-react';
import useCountUp from '../hooks/useCountUp.js';

const TONES = {
  violet: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
  cyan: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
};

// Clickable KPI tile with an animated number. `format` turns the raw number into text.
export default function StatCard({ icon: Icon, label, value, format, sub, tone = 'violet', onClick, delay = 0 }) {
  const animated = useCountUp(value);
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className={`card group animate-rise p-4 text-left sm:p-5 ${
        onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${TONES[tone]}`}>
          <Icon size={20} />
        </span>
        {onClick && (
          <ArrowUpRight size={16} className="text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-violet-500" />
        )}
      </div>
      <p className="mt-4 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">{format(animated)}</p>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      {sub && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
    </Tag>
  );
}
