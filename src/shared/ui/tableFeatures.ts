import {
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
} from '@tanstack/react-table';

/** Метаданные колонки: выравнивание и классы ячеек (ширина, скрытие на узких экранах). */
export interface DataColumnMeta {
  align?: 'left' | 'right';
  className?: string;
}

/**
 * Набор возможностей таблиц проекта (TanStack Table v9 подключает фичи явно):
 * сортировка на клиенте или на сервере (`manualSorting`) и типизированные метаданные колонок.
 */
export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic, text: sortFn_text },
  // Фантомное значение: TanStack берёт из него только тип метаданных колонок, приведение обязательно.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  columnMeta: {} as DataColumnMeta,
});

export type DataTableFeatures = typeof dataTableFeatures;
