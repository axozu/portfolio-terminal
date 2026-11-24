import { CircleSlash, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/utils';
import { Button } from './button';

interface ErrorStateProps {
  onRetry?: () => void;
  title?: string;
  className?: string;
}

/** Ошибка загрузки блока: что случилось и как исправить. */
export function ErrorState({ onRetry, title, className }: ErrorStateProps) {
  const { t } = useTranslation();
  return (
    <div role="alert" className={cn('flex flex-col items-start gap-2 py-4 text-sm', className)}>
      <p className="flex items-center gap-2 font-medium text-foreground">
        <TriangleAlert aria-hidden="true" className="size-4 text-loss" />
        {title ?? t('states.errorTitle')}
      </p>
      <p className="text-muted-foreground">{t('states.errorDescription')}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t('states.retry')}
        </Button>
      ) : null}
    </div>
  );
}

interface EmptyStateProps {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Пустое состояние — приглашение к действию, а не просто «нет данных». */
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  const { t } = useTranslation();
  return (
    <div className={cn('flex flex-col items-start gap-2 py-4 text-sm', className)}>
      <p className="flex items-center gap-2 font-medium text-foreground">
        <CircleSlash aria-hidden="true" className="size-4 text-muted-foreground" />
        {title ?? t('states.empty')}
      </p>
      {description ? <p className="text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  );
}
