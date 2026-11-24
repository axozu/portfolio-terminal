import { QueryErrorResetBoundary } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import { ErrorState } from '@/shared/ui/states';

/**
 * Error boundary уровня страницы: ошибка одной страницы не роняет каркас.
 * «Повторить» сбрасывает упавшие запросы и перерисовывает страницу.
 * Сбрасывается при переходе на другую страницу (ключ — путь).
 */
export function PageErrorBoundary({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          key={pathname}
          onReset={reset}
          fallback={({ reset: retry }) => (
            <ErrorState title={t('states.errorPageTitle')} onRetry={retry} />
          )}
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
