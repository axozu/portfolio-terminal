import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTransactions } from '@/entities/transaction';
import type { Transaction } from '@/shared/model';
import { useUiStore } from '@/shared/store/ui';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Skeleton } from '@/shared/ui/skeleton';
import { EmptyState, ErrorState } from '@/shared/ui/states';
import { hasFilters } from './model/queryParams';
import { useTransactionsQuery } from './model/useTransactionsQuery';
import { DeleteTransactionDialog } from './ui/DeleteTransactionDialog';
import { ExportCsvButton } from './ui/ExportCsvButton';
import { Pagination } from './ui/Pagination';
import { TransactionsTable } from './ui/TransactionsTable';
import { TransactionsToolbar } from './ui/TransactionsToolbar';

export function TransactionsPage() {
  const { t } = useTranslation();
  const { query, setQuery } = useTransactionsQuery();
  const { data, isPending, isError, refetch, isPlaceholderData } = useTransactions(query);
  const openCreateForm = useUiStore((s) => s.openCreateForm);
  const openEditForm = useUiStore((s) => s.openEditForm);
  const [toDelete, setToDelete] = useState<Transaction | null>(null);
  const onDelete = useCallback((tx: Transaction) => {
    setToDelete(tx);
  }, []);

  return (
    <section data-testid="page-transactions" className="flex flex-col gap-3 md:gap-4">
      <PageHeader
        title={t('pages.transactions')}
        meta={data ? t('transactionsPage.count', { count: data.total }) : undefined}
      />
      <div className="border bg-card">
        <div className="border-b p-3">
          <TransactionsToolbar
            query={query}
            onChange={setQuery}
            actions={<ExportCsvButton query={query} />}
          />
        </div>
        {isPending ? (
          <div className="grid gap-2 p-3">
            {Array.from({ length: 10 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="px-3">
            <ErrorState onRetry={() => void refetch()} />
          </div>
        ) : data.items.length === 0 ? (
          <EmptyState
            className="px-3"
            description={
              hasFilters(query) ? t('transactionsPage.empty') : t('transactionsPage.emptyLedger')
            }
            action={
              hasFilters(query) ? undefined : (
                <Button
                  size="sm"
                  onClick={() => {
                    openCreateForm({ type: 'deposit' });
                  }}
                >
                  {t('header.newTransaction')}
                </Button>
              )
            }
          />
        ) : (
          <div className={cn('transition-opacity', isPlaceholderData && 'opacity-60')}>
            <TransactionsTable
              items={data.items}
              sort={query.sort}
              onSortChange={(sort) => {
                setQuery({ sort });
              }}
              onEdit={openEditForm}
              onDelete={onDelete}
            />
            <Pagination
              page={query.page}
              pageSize={query.pageSize}
              total={data.total}
              onChange={setQuery}
            />
          </div>
        )}
      </div>
      <DeleteTransactionDialog
        transaction={toDelete}
        onClose={() => {
          setToDelete(null);
        }}
      />
    </section>
  );
}
