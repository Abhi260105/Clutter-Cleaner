// Titled card wrapper used by every chart and list on the dashboard.
export default function SectionCard({ title, subtitle, action, children, className = '', delay = 0 }) {
  return (
    <section style={{ animationDelay: `${delay}ms` }} className={`card min-w-0 animate-rise p-5 ${className}`}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
