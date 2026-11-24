import { setupWorker } from 'msw/browser';
import { toIsoDate } from '@/shared/lib/date';
import { MockDb } from './db';
import { createHandlers } from './handlers';
import { browserNetworkSettings, syncChaosFromUrl } from './network';

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Запускает фейковый API в браузере (и в dev, и в production-сборке).
 * Данные генерируются относительно сегодняшней даты пользователя.
 */
export async function startMockApi(): Promise<MockDb> {
  syncChaosFromUrl(window.location.search);
  const db = new MockDb({ today: toIsoDate(new Date()), storage: safeLocalStorage() });
  const worker = setupWorker(...createHandlers(db, browserNetworkSettings));
  await worker.start({
    onUnhandledFrame: 'bypass',
    quiet: true,
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  });
  return db;
}
