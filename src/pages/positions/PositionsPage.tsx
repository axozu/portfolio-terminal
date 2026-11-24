import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAssets } from '@/entities/asset';
import { usePositions } from '@/entities/portfolio';
import { useUiStore } from '@/shared/store/ui';
import { Button } from '@/shared/ui/button';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Skeleton } from '@/shared/ui/skeleton';
import { EmptyState, ErrorState } from '@/shared/ui/states';
import {
  buildPositionRows,
  EMPTY_FILTERS,
  filterPositionRows,
  sectorsOf,
  type PositionFilters,
} from './model/rows';
import { PositionsTable } from './ui/PositionsTable';
import { PositionsToolbar } from './ui/PositionsToolbar';

export function PositionsPage() {
  const { t } = useTranslation();
  const openCreateForm = useUiStore((s) => s.openCreateForm);
  const positions = usePositions();
  const assets = useAssets();
  const [filters, setFilters] = useState<PositionFilters>(EMPTY_FILTERS);

  const rows = useMemo(
    () => (positions.data && assets.data ? buildPositionRows(positions.data, assets.data) : []),
    [positions.data, assets.data],
  );
  const visible = useMemo(() => filterPositionRows(rows, filters), [rows, filters]);

  const isPending = positions.isPending || assets.isPending;
  const isError = positions.isError || assets.isError;

  return (
    <section data-testid="page-positions" className="flex flex-col gap-3 md:gap-4">
      <PageHeader
        title={t('pages.positions')}
        meta={rows.length > 0 ? t('positions.count', { count: rows.length }) : undefined}
      />
      <div className="border bg-card">
        <div className="border-b p-3">
          <PositionsToolbar filters={filters} sectors={sectorsOf(rows)} onChange={setFilters} />
        </div>
        {isPending ? (
          <div className="grid gap-2 p-3">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="px-3">
            <ErrorState
              onRetry={() => {
                void positions.refetch();
                void assets.refetch();
              }}
            />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            className="px-3"
            description={t('positions.emptyPortfolio')}
            action={
              <Button
                size="sm"
                onClick={() => {
                  openCreateForm({ type: 'buy' });
                }}
              >
                {t('header.newTransaction')}
              </Button>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            className="px-3"
            description={t('positions.empty')}
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setFilters(EMPTY_FILTERS);
                }}
              >
                {t('positions.resetFilters')}
              </Button>
            }
          />
        ) : (
          <PositionsTable rows={visible} />
        )}
      </div>
    </section>
  );
}
