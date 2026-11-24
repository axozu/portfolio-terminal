import { QueryClient, type QueryClientConfig } from '@tanstack/react-query';
import { isApiError } from './http';

const MAX_RETRIES = 2;

/** Повторяем только то, что может пройти со второй попытки: сеть и 5xx. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) return false;
  return !isApiError(error) || error.status >= 500;
}

export const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: shouldRetry,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
};

export function createQueryClient(): QueryClient {
  return new QueryClient(queryClientConfig);
}
