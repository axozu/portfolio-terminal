import {
  ArrowLeftRight,
  ChartNoAxesCombined,
  LayoutDashboard,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  labelKey: 'nav.overview' | 'nav.positions' | 'nav.transactions' | 'nav.analytics';
  icon: LucideIcon;
  /** Активна только при точном совпадении пути (для «/»). */
  end?: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', labelKey: 'nav.overview', icon: LayoutDashboard, end: true },
  { to: '/positions', labelKey: 'nav.positions', icon: Wallet },
  { to: '/transactions', labelKey: 'nav.transactions', icon: ArrowLeftRight },
  { to: '/analytics', labelKey: 'nav.analytics', icon: ChartNoAxesCombined },
];
