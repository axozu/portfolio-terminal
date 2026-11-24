import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAssets } from '@/entities/asset';
import type { TransactionsQuery } from '@/shared/api';
import { useDebouncedCallback } from '@/shared/lib/useDebouncedCallback';
import { TRANSACTION_TYPES } from '@/shared/model';
import { Button } from '@/shared/ui/button';
import { SearchInput } from '@/shared/ui/SearchInput';
import { Select } from '@/shared/ui/Select';
import { hasFilters } from '../model/queryParams';

const dateClass =
  'h-8 rounded-sm border border-input bg-background px-2 text-[13px] text-foreground [color-scheme:dark]';

interface ToolbarProps {
  query: TransactionsQuery;
  onChange: (patch: Partial<TransactionsQuery>) => void;
  actions?: ReactNode;
}

export function TransactionsToolbar({ query, onChange, actions }: ToolbarProps) {
  const { t } = useTranslation();
  const { data: assets = [] } = useAssets();
  const [search, setSearch] = useState(query.q ?? '');
  const applySearch = useDebouncedCallback((q: string) => {
    onChange({ q: q.trim() === '' ? undefined : q });
  }, 300);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchInput
        aria-label={t('transactionsPage.search')}
        placeholder={t('transactionsPage.searchPlaceholder')}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          applySearch(e.target.value);
        }}
        className="w-full sm:w-56"
      />
      <Select
        aria-label={t('transactionsPage.typeFilter')}
        value={query.type ?? ''}
        onChange={(e) => {
          onChange({ type: TRANSACTION_TYPES.find((type) => type === e.target.value) });
        }}
        className="min-w-32 flex-1 sm:flex-none"
      >
        <option value="">{t('transactionsPage.allTypes')}</option>
        {TRANSACTION_TYPES.map((type) => (
          <option key={type} value={type}>
            {t(`transactionType.${type}`)}
          </option>
        ))}
      </Select>
      <Select
        aria-label={t('transactionsPage.assetFilter')}
        value={query.ticker ?? ''}
        onChange={(e) => {
          onChange({ ticker: e.target.value === '' ? undefined : e.target.value });
        }}
        className="min-w-32 flex-1 sm:flex-none"
      >
        <option value="">{t('transactionsPage.allAssets')}</option>
        {assets.map((asset) => (
          <option key={asset.ticker} value={asset.ticker}>
            {asset.ticker}
          </option>
        ))}
      </Select>
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {t('transactionsPage.from')}
        <input
          type="date"
          value={query.from ?? ''}
          max={query.to}
          onChange={(e) => {
            onChange({ from: e.target.value || undefined });
          }}
          className={dateClass}
        />
      </label>
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {t('transactionsPage.to')}
        <input
          type="date"
          value={query.to ?? ''}
          min={query.from}
          onChange={(e) => {
            onChange({ to: e.target.value || undefined });
          }}
          className={dateClass}
        />
      </label>
      {hasFilters(query) ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSearch('');
            onChange({
              type: undefined,
              ticker: undefined,
              from: undefined,
              to: undefined,
              q: undefined,
            });
          }}
        >
          {t('transactionsPage.clearFilters')}
        </Button>
      ) : null}
      <div className="ml-auto flex gap-2">{actions}</div>
    </div>
  );
}
