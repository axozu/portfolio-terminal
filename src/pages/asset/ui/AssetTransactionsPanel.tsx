import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useTransactions } from '@/entities/transaction';
import { TransactionLine } from '@/entities/transaction/ui/TransactionLine';
import { Panel } from '@/shared/ui/Panel';
import { Skeleton } from '@/shared/ui/skeleton';
import { EmptyState, ErrorState } from '@/shared/ui/states';

const PAGE_SIZE = 8;

export function AssetTransactionsPanel({ ticker }: { ticker: string }) {
  const { t } = useTranslation();
  const { data, isPending, isError, refetch } = useTransactions({
    ticker,
    sort: 'date:desc',
    page: 1,
    pageSize: PAGE_SIZE,
  });

  return (
    <Panel
      title={t('asset.transactions.title', { ticker })}
      className="xl:col-span-12"
      actions={
        data && data.total > PAGE_SIZE ? (
          <Link
            to={`/transactions?ticker=${ticker}`}
            className="text-xs text-primary underline-offset-4 hover:underline"
          >
            {t('asset.transactions.viewAll', { ticker })}
          </Link>
        ) : null
      }
    >
      {isPending ? (
        <div className="grid gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState description={t('asset.transactions.empty')} />
      ) : (
        <ul className="grid gap-x-6 md:grid-cols-2">
          {data.items.map((tx) => (
            <li key={tx.id} className="border-b">
              <TransactionLine tx={tx} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
