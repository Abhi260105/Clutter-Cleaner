import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Moon, ScanSearch, Sun } from 'lucide-react';
import { ALL_ITEMS } from '../navigation.js';

export default function Topbar({ dark, onToggleTheme, onOpenMenu }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const current = ALL_ITEMS.find((i) => i.path === pathname);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-md dark:border-white/10 dark:bg-navy-950/80 sm:px-6">
      <button onClick={onOpenMenu} className="btn-ghost !p-2 lg:hidden" aria-label="Open menu"><Menu size={20} /></button>
      <h1 className="flex-1 truncate text-lg font-bold text-slate-900 dark:text-white">{current?.title || 'Not found'}</h1>

      <button onClick={() => navigate('/scanner')} className="btn-primary">
        <ScanSearch size={16} /> <span className="hidden sm:inline">New scan</span>
      </button>
      <button onClick={onToggleTheme} className="btn-ghost !p-2.5" aria-label="Toggle dark mode" title={dark ? 'Switch to light' : 'Switch to dark'}>
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </header>
  );
}
