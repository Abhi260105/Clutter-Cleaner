import { NavLink } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, Trash2, X } from 'lucide-react';
import { NAV_GROUPS } from '../navigation.js';

// Desktop: collapsible rail. Mobile: slide-in drawer (controlled by `open`).
export default function Sidebar({ collapsed, onToggleCollapse, open, onClose }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-navy-950/40 backdrop-blur-sm lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200/70 bg-white transition-all duration-300 dark:border-white/10 dark:bg-navy-900
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 ${collapsed ? 'lg:w-[76px]' : 'lg:w-64'} w-64`}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-400 text-white shadow-md">
              <Trash2 size={18} />
            </span>
            {!collapsed && (
              <span className="whitespace-nowrap text-sm font-bold leading-tight text-slate-900 dark:text-white">
                Clutter<span className="text-violet-600 dark:text-cyan-300">Cleaner</span>
              </span>
            )}
          </div>
          <button onClick={onClose} className="btn-ghost !p-1.5 lg:hidden" aria-label="Close menu"><X size={18} /></button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {!collapsed && <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group.label}</p>}
              <ul className="space-y-1">
                {group.items.map(({ path, title, icon: Icon }) => (
                  <li key={path}>
                    <NavLink
                      to={path} end={path === '/'} onClick={onClose} title={collapsed ? title : undefined}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${collapsed ? 'lg:justify-center' : ''} ${
                          isActive
                            ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-md shadow-violet-500/25'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
                        }`
                      }
                    >
                      <Icon size={19} className="shrink-0 transition-transform group-hover:scale-110" />
                      {!collapsed && <span className="truncate">{title}</span>}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <button
          onClick={onToggleCollapse}
          className="m-3 hidden items-center justify-center gap-2 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5 lg:flex"
        >
          {collapsed ? <ChevronsRight size={16} /> : <><ChevronsLeft size={16} /> Collapse</>}
        </button>
      </aside>
    </>
  );
}
