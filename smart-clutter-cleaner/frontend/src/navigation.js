import {
  LayoutDashboard, ScanSearch, Copy, HardDrive, Download, Sparkles,
  Images, BarChart3, Brain, ShieldCheck, History, Settings,
} from 'lucide-react';

// Single source of truth for the sidebar and the router.
// `phase` tells the placeholder page when the real module arrives.
export const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { path: '/', title: 'Dashboard', icon: LayoutDashboard },
      { path: '/scanner', title: 'Smart Scanner', icon: ScanSearch, phase: 3, blurb: 'Pick folders, watch live progress, pause or cancel scans.' },
    ],
  },
  {
    label: 'Find',
    items: [
      { path: '/duplicates', title: 'Duplicates', icon: Copy, phase: 4, blurb: 'SHA-256 duplicate groups with preview and keep-one recommendations.' },
      { path: '/large-files', title: 'Large Files', icon: HardDrive, phase: 4, blurb: 'Biggest files first, filter by type, archive or remove.' },
      { path: '/downloads', title: 'Old Downloads', icon: Download, phase: 5, blurb: 'Outdated installers, ZIPs and forgotten downloads.' },
      { path: '/similar', title: 'Similar Files', icon: Images, phase: 10, blurb: 'Visually similar images and near-identical documents.' },
    ],
  },
  {
    label: 'Clean',
    items: [
      { path: '/cleanup', title: 'Cleanup Center', icon: Sparkles, phase: 6, blurb: 'Duplicates, temp files, empty folders, broken shortcuts and more.' },
      { path: '/quarantine', title: 'Quarantine', icon: ShieldCheck, phase: 11, blurb: 'Restore or permanently delete quarantined files, with confirmation.' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { path: '/analytics', title: 'Analytics', icon: BarChart3, phase: 9, blurb: 'Detailed reports with PDF and CSV export.' },
      { path: '/ai', title: 'AI Categorizer', icon: Brain, phase: 10, blurb: 'Optional local Ollama suggestions for organizing files.' },
      { path: '/history', title: 'History', icon: History, phase: 8, blurb: 'Past scans and cleanup operations.' },
      { path: '/settings', title: 'Settings', icon: Settings, phase: 8, blurb: 'Scan locations, exclusions, thresholds and preferences.' },
    ],
  },
];

export const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);
