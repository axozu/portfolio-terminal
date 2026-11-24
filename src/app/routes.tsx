import type { RouteObject } from 'react-router';
import { AppLayout } from './layout/AppLayout';
import { RouteErrorPage } from './layout/RouteErrorPage';

/**
 * Описание маршрутов. Каждая страница грузится лениво — отдельным чанком.
 * Вынесено отдельно от `createBrowserRouter`, чтобы тесты могли собрать
 * те же маршруты в `createMemoryRouter`.
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import('@/pages/overview')).OverviewPage }),
      },
      {
        path: 'positions',
        lazy: async () => ({ Component: (await import('@/pages/positions')).PositionsPage }),
      },
      {
        path: 'assets/:ticker',
        lazy: async () => ({ Component: (await import('@/pages/asset')).AssetPage }),
      },
      {
        path: 'transactions',
        lazy: async () => ({
          Component: (await import('@/pages/transactions')).TransactionsPage,
        }),
      },
      {
        path: 'analytics',
        lazy: async () => ({ Component: (await import('@/pages/analytics')).AnalyticsPage }),
      },
      {
        path: '*',
        lazy: async () => ({ Component: (await import('@/pages/not-found')).NotFoundPage }),
      },
    ],
  },
];
