import { Search } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * Поле поиска по таблице. Атрибут `data-table-search` находит горячая клавиша «/»,
 * чтобы поставить фокус в поиск текущей таблицы.
 */
export function SearchInput({ className, ...props }: ComponentProps<'input'>) {
  return (
    <div className={cn('relative', className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        data-table-search=""
        {...props}
        className="h-8 w-full rounded-sm border border-input bg-background py-1 pr-2 pl-7 text-[13px] text-foreground placeholder:text-muted-foreground"
      />
    </div>
  );
}
