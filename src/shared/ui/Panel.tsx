import { useId, type ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

interface PanelProps {
  title: ReactNode;
  /** Элементы справа в заголовке: переключатели периода, ссылки. */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

/** Основной строительный блок дашборда: панель с заголовком и тонкой рамкой. */
export function Panel({ title, actions, children, className, bodyClassName }: PanelProps) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className={cn('flex min-w-0 flex-col border bg-card', className)}
    >
      <header className="flex min-h-10 items-center justify-between gap-3 border-b px-3 py-1.5">
        <h2 id={titleId} className="truncate text-[13px] font-medium text-foreground">
          {title}
        </h2>
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
      </header>
      <div className={cn('min-h-0 flex-1 p-3', bodyClassName)}>{children}</div>
    </section>
  );
}
