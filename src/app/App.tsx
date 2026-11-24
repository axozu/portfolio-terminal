import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RouterProvider } from 'react-router';
import { toast } from 'sonner';
import type { StartupNotice } from '@/mocks/db';
import { Toaster } from '@/shared/ui/sonner';
import { TooltipProvider } from '@/shared/ui/tooltip';
import { AppProviders } from './providers/AppProviders';
import { router } from './router';

interface AppProps {
  /** Уведомление фейкового API при старте (например, сброс устаревших изменений). */
  startupNotice?: StartupNotice | null;
}

function StartupToast({ notice }: { notice: StartupNotice | null }) {
  const { t } = useTranslation();
  useEffect(() => {
    if (notice === 'demo_data_refreshed') toast.info(t('notices.demoRefreshed'));
    // Показываем один раз при старте, смена языка не должна дублировать тост.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notice]);
  return null;
}

export function App({ startupNotice = null }: AppProps) {
  return (
    <AppProviders>
      <TooltipProvider delayDuration={300}>
        <RouterProvider router={router} />
        <Toaster />
        <StartupToast notice={startupNotice} />
      </TooltipProvider>
    </AppProviders>
  );
}
