import { Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

interface KpiProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  /** Пояснение (например, формула) — во всплывающей подсказке у подписи. */
  hint?: string;
}

/** Показатель: подпись, крупное число, вторая строка. */
export function Kpi({ label, value, sub, hint }: KpiProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-3 py-2.5 md:px-4">
      <dt className="flex items-center gap-1 text-xs text-muted-foreground">
        {label}
        {hint ? (
          <Tooltip>
            <TooltipTrigger
              aria-label={hint}
              className="rounded-sm text-muted-foreground hover:text-foreground"
            >
              <Info aria-hidden="true" className="size-3" />
            </TooltipTrigger>
            <TooltipContent className="max-w-72">{hint}</TooltipContent>
          </Tooltip>
        ) : null}
      </dt>
      <dd className="num truncate text-lg leading-tight text-foreground md:text-xl">{value}</dd>
      {sub ? <dd className="truncate text-xs text-muted-foreground">{sub}</dd> : null}
    </div>
  );
}

/**
 * Сетка показателей одной панелью. У ячеек рамки справа и снизу; внешний контейнер
 * обрезает крайние, поэтому линии всегда одинарные при любом числе колонок.
 */
export function KpiGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="overflow-hidden border bg-card">
      <dl
        className={cn(
          '-mr-px -mb-px grid grid-cols-2 [&>*]:border-r [&>*]:border-b',
          className ?? 'md:grid-cols-3 xl:grid-cols-5',
        )}
      >
        {children}
      </dl>
    </div>
  );
}
