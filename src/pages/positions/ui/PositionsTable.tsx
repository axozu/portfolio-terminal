import { useTable, type SortingState } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useFormat } from '@/shared/i18n';
import { DataTable, FooterCell } from '@/shared/ui/DataTable';
import { Delta } from '@/shared/ui/Delta';
import { dataTableFeatures } from '@/shared/ui/tableFeatures';
import { positionTotals, type PositionRow } from '../model/rows';
import { positionColumns } from './columns';

export function PositionsTable({ rows }: { rows: readonly PositionRow[] }) {
  const { t } = useTranslation();
  const format = useFormat();
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'marketValue', desc: true }]);
  const columns = useMemo(() => positionColumns(t, format), [t, format]);
  const data = useMemo(() => [...rows], [rows]);
  const totals = positionTotals(rows);

  const table = useTable(
    {
      features: dataTableFeatures,
      columns,
      data,
      state: { sorting },
      onSortingChange: setSorting,
      getRowId: (row) => row.ticker,
    },
    (state) => ({ sorting: state.sorting }),
  );

  return (
    <DataTable
      table={table}
      label={t('positions.tableLabel')}
      onRowClick={(row) => {
        void navigate(`/assets/${row.original.ticker}`);
      }}
      footer={
        <tr>
          <FooterCell sticky>{t('positions.total', { count: rows.length })}</FooterCell>
          <FooterCell className="max-lg:hidden" />
          <FooterCell />
          <FooterCell />
          <FooterCell />
          <FooterCell align="right">
            <Delta value={totals.dayChangePct} kind="percent" />
          </FooterCell>
          <FooterCell align="right">
            <span className="num">{format.money(totals.marketValue)}</span>
          </FooterCell>
          <FooterCell align="right">
            <Delta value={totals.unrealizedPnl} kind="money" arrow={false} />
          </FooterCell>
          <FooterCell align="right">
            <Delta value={totals.unrealizedPnlPct} kind="percent" />
          </FooterCell>
          <FooterCell align="right">
            <span className="num">{format.percent(totals.weight, { decimals: 1 })}</span>
          </FooterCell>
          <FooterCell className="max-md:hidden" />
        </tr>
      }
    />
  );
}
