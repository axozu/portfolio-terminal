import { Outlet } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Hotkeys } from '@/features/hotkeys';
import { PriceFeedRunner } from '@/features/price-feed';
import { TransactionFormSheet } from '@/features/transaction-form';
import { useUiStore } from '@/shared/store/ui';
import { cn } from '@/shared/lib/utils';
import { BottomNav } from './BottomNav';
import { Footer } from './Footer';
import { Header } from './Header';
import { PageErrorBoundary } from './PageErrorBoundary';
import { Sidebar } from './Sidebar';
import { TickerTape } from './TickerTape';

export function AppLayout() {
  const { t } = useTranslation();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);

  return (
    <div
      className={cn(
        'flex min-h-dvh flex-col pb-bottom-nav md:pb-0',
        'md:pl-rail xl:pl-sidebar',
        collapsed && 'xl:pl-rail',
      )}
    >
      <a
        href="#main"
        className="sr-only z-50 bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {t('app.skipToContent')}
      </a>
      <Sidebar />
      <div className="sticky top-0 z-30">
        <Header />
        <TickerTape />
      </div>
      <main id="main" tabIndex={-1} className="flex-1 p-3 outline-none md:p-4">
        <PageErrorBoundary>
          <Outlet />
        </PageErrorBoundary>
      </main>
      <Footer />
      <BottomNav />
      <TransactionFormSheet />
      <PriceFeedRunner />
      <Hotkeys />
    </div>
  );
}
