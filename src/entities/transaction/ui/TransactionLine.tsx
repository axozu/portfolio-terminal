import { ArrowDownLeft, ArrowUpRight, Coins, Minus, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFormat } from '@/shared/i18n';
import { cashEffect } from '@/shared/lib/finance';
import type { Transaction, TransactionType } from '@/shared/model';

const TYPE_ICON = {
  buy: ArrowDownLeft,
  sell: ArrowUpRight,
  dividend: Coins,
  deposit: Plus,
  withdrawal: Minus,
} satisfies Record<TransactionType, unknown>;

/** Компактная строка сделки: тип, актив, дата и влияние на кэш. */
export function TransactionLine({ tx }: { tx: Transaction }) {
  const { t } = useTranslation();
  const format = useFormat();
  const Icon = TYPE_ICON[tx.type];
  const effect = cashEffect(tx);

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-sm border bg-raised text-muted-foreground">
        <Icon aria-hidden="true" className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] text-foreground">
          {t(`transactionType.${tx.type}`)}
          {tx.ticker ? <span className="num text-muted-foreground"> {tx.ticker}</span> : null}
          {tx.quantity !== null ? (
            <span className="num text-muted-foreground"> × {format.quantity(tx.quantity, 8)}</span>
          ) : null}
        </span>
        <span className="num block text-xs text-muted-foreground">{format.date(tx.date)}</span>
      </span>
      <span className="num text-[13px] text-foreground">
        {format.money(effect, { signed: true })}
      </span>
    </div>
  );
}
