import { useTable, type SortingState, type Updater } from '@tanstack/react-table';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TRANSACTION_SORT_FIELDS, parseSort, type TransactionSort } from '@/shared/api';
import { useFormat } from '@/shared/i18n';
import type { Transaction } from '@/shared/model';
import { DataTable } from '@/shared/ui/DataTable';
import { dataTableFeatures } from '@/shared/ui/tableFeatures';
import { transactionColumns } from './columns';

interface TransactionsTableProps {
  items: readonly Transaction[];
  sort: TransactionSort;
  onSortChange: (sort: TransactionSort) => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}

function toSortingState(sort: TransactionSort): SortingState {
  const { field, direction } = parseSort(sort);
  return [{ id: field, desc: direction === 'desc' }];
}

/** Сортировка серверная: таблица только сообщает новое состояние, данные приходят из API. */
export function TransactionsTable({
  items,
  sort,
  onSortChange,
  onEdit,
  onDelete,
}: TransactionsTableProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const columns = useMemo(
    () => transactionColumns(t, format, { onEdit, onDelete }),
    [t, format, onEdit, onDelete],
  );
  const data = useMemo(() => [...items], [items]);
  const sorting = useMemo(() => toSortingState(sort), [sort]);

  const handleSorting = (updater: Updater<SortingState>) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    const first = next[0];
    const field = TRANSACTION_SORT_FIELDS.find((f) => f === first?.id);
    // Повторный клик по колонке снимает сортировку — возвращаемся к сортировке по дате.
    onSortChange(field && first ? `${field}:${first.desc ? 'desc' : 'asc'}` : 'date:desc');
  };

  const table = useTable(
    {
      features: dataTableFeatures,
      columns,
      data,
      manualSorting: true,
      sortDescFirst: true,
      state: { sorting },
      onSortingChange: handleSorting,
      getRowId: (row) => row.id,
    },
    (state) => ({ sorting: state.sorting }),
  );

  return <DataTable table={table} label={t('transactionsPage.tableLabel')} />;
}
