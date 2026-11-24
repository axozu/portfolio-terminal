import { Pause, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/utils';
import { usePriceFeedStore } from '../model/store';

/** `● LIVE` с кнопкой паузы. Точка пульсирует, только пока фид идёт. */
export function LiveIndicator() {
  const { t } = useTranslation();
  const paused = usePriceFeedStore((s) => s.paused);
  const togglePaused = usePriceFeedStore((s) => s.togglePaused);

  return (
    <button
      type="button"
      onClick={togglePaused}
      aria-pressed={paused}
      aria-label={paused ? t('header.resumeFeed') : t('header.pauseFeed')}
      title={paused ? t('header.resumeFeed') : t('header.pauseFeed')}
      className="group flex h-8 items-center gap-2 rounded-sm border px-2 text-xs hover:bg-accent"
    >
      <span className="relative flex size-2" aria-hidden="true">
        {paused ? null : (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-gain opacity-60" />
        )}
        <span
          className={cn(
            'relative inline-flex size-2 rounded-full',
            paused ? 'bg-muted-foreground' : 'bg-gain',
          )}
        />
      </span>
      <span className="num tracking-wide max-sm:sr-only">
        {paused ? t('header.paused') : t('header.live')}
      </span>
      {paused ? (
        <Play aria-hidden="true" className="size-3 text-muted-foreground max-sm:hidden" />
      ) : (
        <Pause aria-hidden="true" className="size-3 text-muted-foreground max-sm:hidden" />
      )}
    </button>
  );
}
