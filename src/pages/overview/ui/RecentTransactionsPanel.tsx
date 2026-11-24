import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useTransactions } from '@/entities/transaction';
import { TransactionLine } from '@/entities/transaction/ui/TransactionLine';
import { useUiStore } from '@/shared/store/ui';
import { Button } from '@/shared/ui/button';
import { Panel } from '@/shared/ui/Panel';
import { Skeleton } from '@/shared/ui/skeleton';
import { EmptyState, ErrorState } from '@/shared/ui/states';

const RECENT_QUERY = { sort: 'date:desc', page: 1, pageSize: 5 } as const;

export function RecentTransactionsPanel() {
  const { t } = useTranslation();
  const openCreateForm = useUiStore((s) => s.openCreateForm);
  const { data, isPending, isError, refetch } = useTransactions(RECENT_QUERY);

  return (
    <Panel
      title={t('overview.recent.title')}
      className="xl:col-span-7"
      actions={
        <Link
          to="/transactions"
          className="text-xs text-primary underline-offset-4 hover:underline"
        >
          {t('overview.recent.viewAll')}
        </Link>
      }
    >
      {isPending ? (
        <div className="grid gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState
          description={t('overview.recent.empty')}
          action={
            <Button
              size="sm"
              onClick={() => {
                openCreateForm();
              }}
            >
              {t('header.newTransaction')}
            </Button>
          }
        />
      ) : (
        <ul>
          {data.items.map((tx) => (
            <li key={tx.id} className="border-b last:border-b-0">
              <TransactionLine tx={tx} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
