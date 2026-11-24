import type { AssetConstraints } from '@/shared/lib/finance';
import { validateLedger } from '@/shared/lib/finance';
import type { Asset, Candle, IsoDate, Transaction, TransactionInput } from '@/shared/model';
import { generateDemoData } from './generator';
import {
  applyLayer,
  emptyLayer,
  isLayerEmpty,
  loadLayer,
  saveLayer,
  type UserLayer,
} from './persistence';

/** Уведомление при старте: пользовательский слой пришлось сбросить. */
export type StartupNotice = 'demo_data_refreshed';

export interface MockDbOptions {
  today: IsoDate;
  storage: Storage | null;
  seed?: number;
  createId?: () => string;
}

/**
 * In-memory «база»: сгенерированные данные + пользовательский слой из `localStorage`.
 * Мутации не проверяют бизнес-правила — это делают обработчики через `validateTransaction`.
 */
export class MockDb {
  readonly today: IsoDate;
  readonly dates: readonly IsoDate[];
  readonly assets: readonly Asset[];
  readonly assetsByTicker: ReadonlyMap<string, Asset>;
  readonly candles: Readonly<Record<string, readonly Candle[]>>;
  readonly benchmark: readonly Candle[];
  readonly constraints: ReadonlyMap<string, AssetConstraints>;
  readonly startupNotice: StartupNotice | null;

  readonly #base: readonly Transaction[];
  readonly #storage: Storage | null;
  readonly #createId: () => string;
  #layer: UserLayer;
  #transactions: Transaction[];

  constructor({ today, storage, seed, createId }: MockDbOptions) {
    const data = generateDemoData({ today, seed });
    // «Сегодня» — реальная дата: в выходные можно записать пополнение сегодняшним днём,
    // хотя последняя свеча — пятничная.
    this.today = today;
    this.dates = data.dates;
    this.assets = data.assets;
    this.assetsByTicker = new Map(data.assets.map((a) => [a.ticker, a]));
    this.candles = data.candles;
    this.benchmark = data.benchmark;
    this.constraints = new Map(
      data.assets.map((a) => [
        a.ticker,
        {
          quantityPrecision: a.quantityPrecision,
          historyStart: data.candles[a.ticker]?.[0]?.date ?? this.today,
        },
      ]),
    );
    this.#base = data.transactions;
    this.#storage = storage;
    this.#createId = createId ?? (() => `user-${crypto.randomUUID()}`);

    const { layer, notice } = this.#restoreLayer();
    this.#layer = layer;
    this.#transactions = applyLayer(this.#base, layer);
    this.startupNotice = notice;
  }

  /**
   * Сгенерированная история сдвигается вместе с текущей датой, поэтому сохранённый слой
   * перепроверяется целиком. Некорректный или устаревший слой сбрасывается.
   */
  #restoreLayer(): { layer: UserLayer; notice: StartupNotice | null } {
    const loaded = loadLayer(this.#storage);
    if (loaded.status === 'missing') return { layer: emptyLayer(this.today), notice: null };

    if (loaded.status === 'ok' && this.#isLayerValid(loaded.layer)) {
      const layer = { ...loaded.layer, generatedFor: this.today };
      saveLayer(this.#storage, layer);
      return { layer, notice: null };
    }

    const layer = emptyLayer(this.today);
    saveLayer(this.#storage, layer);
    return { layer, notice: 'demo_data_refreshed' };
  }

  #isLayerValid(layer: UserLayer): boolean {
    const baseIds = new Set(this.#base.map((tx) => tx.id));
    const referencesExist = [...layer.updated.map((tx) => tx.id), ...layer.deleted].every((id) =>
      baseIds.has(id),
    );
    const userTxValid = [...layer.added, ...layer.updated].every((tx) => {
      if (tx.date > this.today) return false;
      if (tx.ticker === null) return true;
      const constraints = this.constraints.get(tx.ticker);
      return constraints !== undefined && tx.date >= constraints.historyStart;
    });
    return referencesExist && userTxValid && validateLedger(applyLayer(this.#base, layer)) === null;
  }

  get transactions(): readonly Transaction[] {
    return this.#transactions;
  }

  get hasUserChanges(): boolean {
    return !isLayerEmpty(this.#layer);
  }

  findTransaction(id: string): Transaction | undefined {
    return this.#transactions.find((tx) => tx.id === id);
  }

  add(input: TransactionInput): Transaction {
    const tx: Transaction = { ...input, id: this.#createId() };
    this.#commit({ ...this.#layer, added: [...this.#layer.added, tx] });
    return tx;
  }

  update(id: string, input: TransactionInput): Transaction {
    const tx: Transaction = { ...input, id };
    const layer = this.#layer;
    const isUserTx = layer.added.some((t) => t.id === id);
    this.#commit(
      isUserTx
        ? { ...layer, added: layer.added.map((t) => (t.id === id ? tx : t)) }
        : { ...layer, updated: [...layer.updated.filter((t) => t.id !== id), tx] },
    );
    return tx;
  }

  remove(id: string): void {
    const layer = this.#layer;
    const isUserTx = layer.added.some((t) => t.id === id);
    this.#commit(
      isUserTx
        ? { ...layer, added: layer.added.filter((t) => t.id !== id) }
        : {
            ...layer,
            updated: layer.updated.filter((t) => t.id !== id),
            deleted: [...layer.deleted, id],
          },
    );
  }

  reset(): void {
    this.#commit(emptyLayer(this.today));
  }

  #commit(layer: UserLayer): void {
    this.#layer = layer;
    this.#transactions = applyLayer(this.#base, layer);
    saveLayer(this.#storage, layer);
  }
}
