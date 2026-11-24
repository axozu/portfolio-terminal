import { flexRender, type Header, type ReactTable, type Row } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import type { DataTableFeatures } from './tableFeatures';

const STICKY = 'sticky left-0 z-10 bg-card';

function SortableHeader<T extends object>({ header }: { header: Header<DataTableFeatures, T> }) {
  const sorted = header.column.getIsSorted();
  const label = flexRender(header.column.columnDef.header, header.getContext());
  if (!header.column.getCanSort()) return <>{label}</>;
  const Icon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={header.column.getToggleSortingHandler()}
      className={cn(
        'inline-flex items-center gap-1 hover:text-foreground',
        sorted && 'text-foreground',
        header.column.columnDef.meta?.align === 'right' && 'flex-row-reverse',
      )}
    >
      {label}
      <Icon aria-hidden="true" className={cn('size-3', !sorted && 'opacity-40')} />
    </button>
  );
}

interface DataTableProps<T extends object, S> {
  table: ReactTable<DataTableFeatures, T, S>;
  /** Доступное название таблицы. */
  label: string;
  onRowClick?: (row: Row<DataTableFeatures, T>) => void;
  footer?: ReactNode;
  /** Первая колонка закреплена при горизонтальной прокрутке. */
  stickyFirstColumn?: boolean;
  className?: string;
}

/**
 * Таблица поверх TanStack Table: сортируемые заголовки с `aria-sort`, горизонтальная
 * прокрутка на узких экранах с закреплённой первой колонкой, необязательная итоговая строка.
 */
export function DataTable<T extends object, S>({
  table,
  label,
  onRowClick,
  footer,
  stickyFirstColumn = true,
  className,
}: DataTableProps<T, S>) {
  const cellClass = (index: number, align?: 'left' | 'right', extra?: string) =>
    cn(
      'px-2.5 py-2 whitespace-nowrap first:pl-3 last:pr-3',
      align === 'right' ? 'text-right' : 'text-left',
      stickyFirstColumn && index === 0 && STICKY,
      extra,
    );

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table aria-label={label} className="w-full border-collapse text-[13px]">
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id} className="border-b">
              {group.headers.map((header, index) => {
                const sorted = header.column.getIsSorted();
                const meta = header.column.columnDef.meta;
                return (
                  <th
                    key={header.id}
                    scope="col"
                    aria-sort={
                      sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined
                    }
                    className={cn(
                      cellClass(index, meta?.align, meta?.className),
                      'h-9 text-xs font-normal text-muted-foreground',
                    )}
                  >
                    {header.isPlaceholder ? null : <SortableHeader header={header} />}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={
                onRowClick
                  ? () => {
                      onRowClick(row);
                    }
                  : undefined
              }
              className={cn(
                'group border-b last:border-b-0',
                onRowClick && 'cursor-pointer hover:bg-accent [&:hover>td]:bg-accent',
              )}
            >
              {row.getAllCells().map((cell, index) => (
                <td
                  key={cell.id}
                  className={cellClass(
                    index,
                    cell.column.columnDef.meta?.align,
                    cell.column.columnDef.meta?.className,
                  )}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer ? <tfoot className="border-t border-t-border-strong">{footer}</tfoot> : null}
      </table>
    </div>
  );
}

/** Ячейка итоговой строки с тем же выравниванием и закреплением, что у колонок. */
export function FooterCell({
  children,
  align,
  sticky,
  className,
}: {
  children?: ReactNode;
  align?: 'left' | 'right';
  sticky?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cn(
        'px-3 py-2 font-medium whitespace-nowrap text-foreground',
        align === 'right' ? 'text-right' : 'text-left',
        sticky && STICKY,
        className,
      )}
    >
      {children}
    </td>
  );
}
