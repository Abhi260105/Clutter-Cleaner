import { Hammer } from 'lucide-react';

// Placeholder for modules built in later phases.
export default function ComingSoon({ title, blurb, phase, icon: Icon }) {
  return (
    <div className="card mx-auto mt-10 max-w-xl animate-rise p-10 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-lift">
        <Icon size={26} />
      </span>
      <h2 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{blurb}</p>
      <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-1.5 text-xs font-semibold text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
        <Hammer size={14} /> Arrives in Phase {phase}
      </p>
    </div>
  );
}
