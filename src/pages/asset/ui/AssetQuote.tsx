import { useLivePrice } from '@/entities/portfolio';
import { useFormat } from '@/shared/i18n';
import { Delta } from '@/shared/ui/Delta';
import { Flash } from '@/shared/ui/Flash';

interface AssetQuoteProps {
  ticker: string;
  /** Цена из API — пока live-фид не прислал тик. */
  price: number;
  previousClose: number;
}

/** Текущая цена актива (live) и изменение к закрытию предыдущего дня. */
export function AssetQuote({ ticker, price: apiPrice, previousClose }: AssetQuoteProps) {
  const format = useFormat();
  const price = useLivePrice(ticker, apiPrice);
  const change = previousClose > 0 ? price / previousClose - 1 : 0;

  return (
    <>
      <Flash value={price} className="num px-0.5 text-base text-foreground">
        {format.price(price)}
      </Flash>
      <Delta value={change} kind="percent" />
    </>
  );
}
