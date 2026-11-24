import { z } from 'zod';
import { transactionSchema, type IsoDate, type Transaction } from '@/shared/model';

/**
 * Пользовательские изменения хранятся «слоем» поверх сгенерированных данных:
 * добавленные, изменённые и удалённые (по id) сделки. Сам сгенерированный леджер
 * не сохраняется — он детерминированно пересоздаётся при каждом запуске.
 */

export const LAYER_STORAGE_KEY = 'portfolio-terminal:demo-layer';
/** Увеличивается при несовместимом изменении генератора или формата слоя. */
export const LAYER_SCHEMA_VERSION = 1;

export interface UserLayer {
  schemaVersion: number;
  /** Дата, на которую был сгенерирован базовый леджер при последнем сохранении. */
  generatedFor: IsoDate;
  added: Transaction[];
  updated: Transaction[];
  deleted: string[];
}

const layerSchema = z.object({
  schemaVersion: z.number(),
  generatedFor: z.string(),
  added: z.array(transactionSchema),
  updated: z.array(transactionSchema),
  deleted: z.array(z.string()),
});

export function emptyLayer(today: IsoDate): UserLayer {
  return {
    schemaVersion: LAYER_SCHEMA_VERSION,
    generatedFor: today,
    added: [],
    updated: [],
    deleted: [],
  };
}

export function isLayerEmpty(layer: UserLayer): boolean {
  return layer.added.length === 0 && layer.updated.length === 0 && layer.deleted.length === 0;
}

export type LoadedLayer =
  { status: 'missing' } | { status: 'invalid' } | { status: 'ok'; layer: UserLayer };

export function loadLayer(storage: Storage | null): LoadedLayer {
  let raw: string | null;
  try {
    raw = storage?.getItem(LAYER_STORAGE_KEY) ?? null;
  } catch {
    return { status: 'missing' };
  }
  if (raw === null) return { status: 'missing' };
  try {
    const parsed = layerSchema.safeParse(JSON.parse(raw));
    if (!parsed.success || parsed.data.schemaVersion !== LAYER_SCHEMA_VERSION)
      return { status: 'invalid' };
    return { status: 'ok', layer: parsed.data };
  } catch {
    return { status: 'invalid' };
  }
}

/** Сохраняет слой; пустой слой удаляет ключ. Ошибки хранилища (приватный режим, квота) не роняют API. */
export function saveLayer(storage: Storage | null, layer: UserLayer): void {
  try {
    if (isLayerEmpty(layer)) storage?.removeItem(LAYER_STORAGE_KEY);
    else storage?.setItem(LAYER_STORAGE_KEY, JSON.stringify(layer));
  } catch {
    // Изменения останутся в памяти до перезагрузки страницы.
  }
}

/** Базовый леджер + слой: изменённые заменяются на месте, удалённые убираются, новые — в конец. */
export function applyLayer(base: readonly Transaction[], layer: UserLayer): Transaction[] {
  const updated = new Map(layer.updated.map((tx) => [tx.id, tx]));
  const deleted = new Set(layer.deleted);
  return [
    ...base.filter((tx) => !deleted.has(tx.id)).map((tx) => updated.get(tx.id) ?? tx),
    ...layer.added,
  ];
}
