// Shared tooltip so every chart looks the same in light and dark mode.
export default function ChartTooltip({ active, payload, label, valueFormat = (v) => v }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur dark:border-white/10 dark:bg-navy-800/95">
      {(label ?? payload[0].payload?.name) && (
        <p className="mb-1 font-semibold capitalize text-slate-700 dark:text-slate-100">{label ?? payload[0].payload.name}</p>
      )}
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
          {valueFormat(p.value, p)}
        </p>
      ))}
    </div>
  );
}
