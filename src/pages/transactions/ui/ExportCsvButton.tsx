import { Download } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAssets } from '@/entities/asset';
import { http, MAX_PAGE_SIZE, type TransactionsPage, type TransactionsQuery } from '@/shared/api';
import type { Transaction } from '@/shared/model';
import { Button } from '@/shared/ui/button';
import { transactionsToCsv } from '../model/csv';

/** Загружает все страницы текущей выборки (с фильтрами и сортировкой). */
async function fetchAll(query: TransactionsQuery): Promise<Transaction[]> {
  const items: Transaction[] = [];
  for (let page = 1; ; page++) {
    const result = await http.get<TransactionsPage>('/transactions', {
      ...query,
      page,
      pageSize: MAX_PAGE_SIZE,
    });
    items.push(...result.items);
    if (items.length >= result.total || result.items.length === 0) return items;
  }
}

function download(content: string, filename: string): void {
  // BOM — чтобы Excel правильно открыл UTF-8 (кириллица в заметках).
  const blob = new Blob(['﻿', content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ExportCsvButton({ query }: { query: TransactionsQuery }) {
  const { t } = useTranslation();
  const { data: assets = [] } = useAssets();
  const [busy, setBusy] = useState(false);

  const exportCsv = async () => {
    setBusy(true);
    try {
      const items = await fetchAll(query);
      const names = new Map(assets.map((a) => [a.ticker, a.name]));
      download(
        transactionsToCsv(items, (ticker) => names.get(ticker)),
        `transactions-${new Date().toISOString().slice(0, 10)}.csv`,
      );
      toast.success(t('transactionsPage.exportDone', { count: items.length }));
    } catch {
      toast.error(t('transactionsPage.exportFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" size="sm" disabled={busy} onClick={() => void exportCsv()}>
      <Download aria-hidden="true" />
      {t('transactionsPage.exportCsv')}
    </Button>
  );
}
