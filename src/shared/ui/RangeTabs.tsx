import { useTranslation } from 'react-i18next';
import { HISTORY_RANGES, type HistoryRange } from '@/shared/lib/finance';
import { cn } from '@/shared/lib/utils';

interface RangeTabsProps {
  value: HistoryRange;
  onChange: (range: HistoryRange) => void;
  label: string;
}

/** Переключатель периода графика: 1M / 3M / 6M / YTD / 1Y / ALL. */
export function RangeTabs({ value, onChange, label }: RangeTabsProps) {
  const { t } = useTranslation();
  return (
    <div role="group" aria-label={label} className="flex">
      {HISTORY_RANGES.map((range) => (
        <button
          key={range}
          type="button"
          aria-pressed={value === range}
          onClick={() => {
            onChange(range);
          }}
          className={cn(
            'num h-7 px-2 text-xs transition-colors',
            value === range
              ? 'bg-accent text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {t(`ranges.${range}`)}
        </button>
      ))}
    </div>
  );
}
