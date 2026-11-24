import { trendOf } from '@/shared/lib/format';
import { useFormat } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';

interface DeltaProps {
  value: number;
  kind: 'money' | 'percent';
  className?: string;
  /** Показывать стрелку ▲▼ (по умолчанию да). */
  arrow?: boolean;
}

const TREND_CLASS = { up: 'text-gain', down: 'text-loss', flat: 'text-muted-foreground' } as const;
const ARROW = { up: '▲', down: '▼', flat: '' } as const;

/**
 * Изменение со знаком. Рост и падение передаются не только цветом:
 * есть знак «+/−» и стрелка ▲▼ (стрелка скрыта от скринридеров — знак уже озвучен).
 */
export function Delta({ value, kind, className, arrow = true }: DeltaProps) {
  const format = useFormat();
  const trend = trendOf(value);
  const text =
    kind === 'money'
      ? format.money(value, { signed: true })
      : format.percent(value, { signed: true });
  return (
    <span className={cn('num inline-flex items-baseline gap-1', TREND_CLASS[trend], className)}>
      {arrow && trend !== 'flat' ? (
        <span aria-hidden="true" className="text-[0.7em]">
          {ARROW[trend]}
        </span>
      ) : null}
      {text}
    </span>
  );
}
