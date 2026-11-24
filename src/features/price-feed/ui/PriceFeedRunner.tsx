import { useEffect, useMemo } from 'react';
import { useAssets } from '@/entities/asset';
import { useLivePricesStore } from '@/shared/store/livePrices';
import { createPriceFeed, type PriceFeed, type PriceFeedOptions } from '../model/priceFeed';

interface PriceFeedRunnerProps {
  /** Для тестов: свои параметры фида (таймеры, случайность). */
  options?: PriceFeedOptions;
}

/**
 * Запускает live-фид для всех активов, пока он не на паузе и вкладка видима.
 * Сам ничего не рисует; цены попадают в стор, откуда их читают компоненты.
 */
export function PriceFeedRunner({ options }: PriceFeedRunnerProps) {
  const { data: assets } = useAssets();
  const paused = useLivePricesStore((s) => s.paused);
  const hidden = useLivePricesStore((s) => s.hidden);
  const seed = useLivePricesStore((s) => s.seed);
  const applyTicks = useLivePricesStore((s) => s.applyTicks);
  const setHidden = useLivePricesStore((s) => s.setHidden);

  useEffect(() => {
    const onVisibility = () => {
      setHidden(document.visibilityState === 'hidden');
    };
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [setHidden]);

  // Фид создаётся один раз на справочник активов; продолжает с последних live-цен после паузы.
  const feed = useMemo<PriceFeed | null>(() => {
    if (!assets) return null;
    const known = useLivePricesStore.getState().prices;
    return createPriceFeed(
      assets.map((a) => ({ ticker: a.ticker, class: a.class, price: known[a.ticker] ?? a.price })),
      options,
    );
  }, [assets, options]);

  useEffect(() => {
    if (!assets) return;
    seed(Object.fromEntries(assets.map((a) => [a.ticker, a.price])));
  }, [assets, seed]);

  useEffect(() => {
    if (!feed || !assets || paused || hidden) return;
    return feed.subscribe(
      assets.map((a) => a.ticker),
      applyTicks,
    );
  }, [feed, assets, paused, hidden, applyTicks]);

  return null;
}
