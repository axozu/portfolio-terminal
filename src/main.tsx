import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import type { StartupNotice } from '@/mocks/db';
import '@/shared/i18n';
import '@/app/styles/index.css';

/**
 * Фейковый API (MSW) должен быть готов до первого запроса. Модуль грузится динамически —
 * отдельным чанком, поэтому генератор и обработчики не попадают в основной бандл.
 */
async function enableMocking(): Promise<StartupNotice | null> {
  try {
    const { startMockApi } = await import('@/mocks/browser');
    const db = await startMockApi();
    return db.startupNotice;
  } catch (error) {
    // Без Service Worker (например, в некоторых приватных режимах) запросы упадут,
    // и страницы покажут состояние ошибки вместо вечного спиннера.
    console.error('Mock API failed to start', error);
    return null;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

const startupNotice = await enableMocking();

createRoot(rootElement).render(
  <StrictMode>
    <App startupNotice={startupNotice} />
  </StrictMode>,
);
