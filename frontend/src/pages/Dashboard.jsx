import { useNavigate } from 'react-router-dom';
import { Copy, FileStack, HardDrive, PiggyBank, RefreshCw, ScanSearch, Sparkles, WifiOff } from 'lucide-react';
import useDashboard from '../hooks/useDashboard.js';
import StatCard from '../components/StatCard.jsx';
import SectionCard from '../components/SectionCard.jsx';
import StorageGauge from '../components/StorageGauge.jsx';
import Recommendations from '../components/Recommendations.jsx';
import RecentScans from '../components/RecentScans.jsx';
import TypeDonut from '../charts/TypeDonut.jsx';
import FolderBars from '../charts/FolderBars.jsx';
import SizeDistribution from '../charts/SizeDistribution.jsx';
import CleanupTrend from '../charts/CleanupTrend.jsx';
import { formatBytes, formatNumber } from '../utils/format.js';

export default function Dashboard() {
  const { loading, demo, error, disk, summary, reload } = useDashboard();
  const navigate = useNavigate();

  if (loading && !summary) {
    return <div className="grid h-64 place-items-center text-sm text-slate-500">Loading dashboard…</div>;
  }

  return (
    <div className="space-y-6">
      {demo && (
        <div className="flex animate-rise items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">
          <WifiOff size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Demo data: backend not connected</p>
            <p className="text-xs opacity-80">{error}. Numbers below are samples; start the API to see your real storage.</p>
          </div>
          <button onClick={reload} className="btn-ghost !py-1 text-xs"><RefreshCw size={14} /> Retry</button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Your storage at a glance</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {summary.has_scan ? 'Based on your latest completed scan.' : 'No scans yet. Run your first scan to find clutter.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={reload} className="btn-ghost" disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => navigate('/cleanup')} className="btn-ghost border border-slate-200 dark:border-white/10"><Sparkles size={16} /> Open cleanup</button>
          <button onClick={() => navigate('/scanner')} className="btn-primary"><ScanSearch size={16} /> Scan now</button>
        </div>
      </div>

      {/* Row 1: disk gauge + KPI tiles */}
      <div className="grid gap-4 xl:grid-cols-5">
        <SectionCard title="Disk capacity" subtitle="Live from your drive" className="xl:col-span-2">
          <StorageGauge disk={disk} />
        </SectionCard>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:col-span-3">
          <StatCard icon={FileStack} tone="violet" label="Files scanned" value={summary.total_files} format={formatNumber} onClick={() => navigate('/scanner')} delay={50} />
          <StatCard icon={Copy} tone="cyan" label="Duplicate files" value={summary.duplicate_files} format={formatNumber} onClick={() => navigate('/duplicates')} delay={100} />
          <StatCard icon={HardDrive} tone="amber" label="Large files" value={summary.large_files} format={formatNumber} onClick={() => navigate('/large-files')} delay={150} />
          <StatCard icon={PiggyBank} tone="emerald" label="Potential savings" value={summary.potential_savings} format={formatBytes} onClick={() => navigate('/cleanup')} delay={200} />
        </div>
      </div>

      {/* Row 2: recommendations + recent scans */}
      <div className="grid gap-4 lg:grid-cols-5">
        <SectionCard title="Smart cleanup recommendations" subtitle="Suggestions only. You review before anything moves." className="lg:col-span-3" delay={100}>
          <Recommendations items={summary.recommendations} />
        </SectionCard>
        <SectionCard title="Recent scan activity" className="lg:col-span-2" delay={150}>
          <RecentScans scans={summary.recent_scans} />
        </SectionCard>
      </div>

      {/* Row 3: type + folder */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Storage by file type" subtitle="Click a legend item to hide it" delay={100}>
          <TypeDonut data={summary.by_type} />
        </SectionCard>
        <SectionCard title="Storage by folder" subtitle="Heaviest folders in the last scan" delay={150}>
          <FolderBars data={summary.by_folder} />
        </SectionCard>
      </div>

      {/* Row 4: distribution + trend */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="File size distribution" subtitle="Files per size bucket" delay={100}>
          <SizeDistribution data={summary.large_distribution} />
        </SectionCard>
        <SectionCard title="Cleanup & recovery" subtitle="What you have cleaned over time" delay={150}>
          <CleanupTrend history={summary.cleanup_history} recovery={summary.recovery} />
        </SectionCard>
      </div>
    </div>
  );
}
