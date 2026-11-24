import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/button';
import { Select } from '@/shared/ui/Select';

const PAGE_SIZES = [10, 20, 50] as const;

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (patch: { page?: number; pageSize?: number }) => void;
}

export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const { t } = useTranslation();
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <nav
      aria-label={t('transactionsPage.pagination')}
      className="flex flex-wrap items-center justify-between gap-3 border-t px-3 py-2 text-xs"
    >
      <span className="text-muted-foreground">{t('transactionsPage.count', { count: total })}</span>
      <div className="flex items-center gap-2">
        <Select
          aria-label={t('transactionsPage.pageSize')}
          value={pageSize}
          onChange={(e) => {
            onChange({ pageSize: Number(e.target.value) });
          }}
          className="w-20"
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </Select>
        <span className="num text-muted-foreground" aria-live="polite">
          {t('transactionsPage.pageOf', { page, pages })}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          aria-label={t('transactionsPage.previous')}
          disabled={page <= 1}
          onClick={() => {
            onChange({ page: page - 1 });
          }}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          aria-label={t('transactionsPage.next')}
          disabled={page >= pages}
          onClick={() => {
            onChange({ page: page + 1 });
          }}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
