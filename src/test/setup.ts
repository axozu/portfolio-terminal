import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import '@/shared/i18n';
import { server } from './mockApi';

// В jsdom нет canvas: Lightweight Charts заменяется доступной заглушкой с той же разметкой.
vi.mock('@/shared/ui/charts/TimeSeriesChart', () => import('./mocks/TimeSeriesChart'));

// Recharts и Radix ждут ResizeObserver, которого в jsdom нет.
class ResizeObserverStub {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

// Страницы и графики грузятся ленивыми чанками — первая трансформация в jsdom бывает дольше секунды.
configure({ asyncUtilTimeout: 5000 });

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  localStorage.clear();
});

afterAll(() => {
  server.close();
});
