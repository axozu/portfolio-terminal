import { Zap } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { isChaosEnabled, setChaosEnabled } from '@/mocks/chaosFlag';
import { cn } from '@/shared/lib/utils';

/**
 * Переключатель режима хаоса: часть запросов фейкового API падает с 500,
 * чтобы показать повторы и состояния ошибок. По умолчанию выключен.
 */
export function ChaosToggle() {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(isChaosEnabled);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      title={t('chaos.hint')}
      onClick={() => {
        const next = !enabled;
        setChaosEnabled(next);
        setEnabled(next);
        toast.info(next ? t('chaos.enabled') : t('chaos.disabled'));
      }}
      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
    >
      <span
        aria-hidden="true"
        className={cn(
          'relative inline-flex h-4 w-7 shrink-0 rounded-full border transition-colors',
          enabled ? 'border-primary bg-primary/30' : 'bg-raised',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-2.5 rounded-full transition-transform',
            enabled ? 'translate-x-3.5 bg-primary' : 'translate-x-0.5 bg-muted-foreground',
          )}
        />
      </span>
      <Zap aria-hidden="true" className="size-3" />
      {t('chaos.label')}
    </button>
  );
}
