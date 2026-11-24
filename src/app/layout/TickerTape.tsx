import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useAssets, type AssetListItem } from '@/entities/asset';
import { useFormat } from '@/shared/i18n';
import { Delta } from '@/shared/ui/Delta';

function TapeItems({ assets, hidden }: { assets: readonly AssetListItem[]; hidden?: boolean }) {
  const format = useFormat();
  return (
    <ul className="flex shrink-0" aria-hidden={hidden}>
      {assets.map((asset) => (
        <li key={asset.ticker}>
          <Link
            to={`/assets/${asset.ticker}`}
            tabIndex={hidden ? -1 : undefined}
            className="flex h-full items-center gap-2 border-r px-3 text-xs whitespace-nowrap hover:bg-accent"
          >
            <span className="num font-medium text-foreground">{asset.ticker}</span>
            <span className="num text-muted-foreground">{format.price(asset.price)}</span>
            <Delta
              value={asset.previousClose > 0 ? asset.price / asset.previousClose - 1 : 0}
              kind="percent"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Бегущая строка тикеров. Список продублирован для бесшовной прокрутки (копия скрыта
 * от скринридеров и клавиатуры). Останавливается при наведении и фокусе;
 * при reduced motion — неподвижная лента с горизонтальной прокруткой.
 */
export function TickerTape() {
  const { t } = useTranslation();
  const { data } = useAssets();

  return (
    <div
      role="region"
      aria-label={t('tape.label')}
      className="group h-tape overflow-hidden border-b bg-background motion-reduce:overflow-x-auto"
    >
      {data ? (
        <div className="flex h-full w-max animate-tape group-focus-within:[animation-play-state:paused] group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          <TapeItems assets={data} />
          <TapeItems assets={data} hidden />
        </div>
      ) : null}
    </div>
  );
}
