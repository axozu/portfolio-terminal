import { setupServer } from 'msw/node';
import { MockDb } from '@/mocks/db';
import { createHandlers } from '@/mocks/handlers';
import type { NetworkSettings } from '@/mocks/network';

/** Фиксированная «сегодняшняя» дата для тестов (вторник). */
export const TEST_TODAY = '2026-11-24';

/** MSW-сервер для Node. Запускается в `setup.ts`; каждый тест подключает свои обработчики. */
export const server = setupServer();

interface TestApiOptions {
  chaos?: boolean;
  random?: () => number;
  storage?: Storage | null;
}

/** Поднимает фейковый API без задержек поверх свежей базы и возвращает её для проверок. */
export function setupTestApi(options: TestApiOptions = {}): MockDb {
  let counter = 0;
  const db = new MockDb({
    today: TEST_TODAY,
    storage: options.storage === undefined ? localStorage : options.storage,
    createId: () => `user-${String(++counter)}`,
  });
  const settings: NetworkSettings = {
    latency: null,
    chaosRate: 0.15,
    isChaosEnabled: () => options.chaos ?? false,
    random: options.random ?? (() => 0.5),
  };
  server.use(...createHandlers(db, settings));
  return db;
}
