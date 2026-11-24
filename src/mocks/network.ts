import { delay, http, HttpResponse, type PathParams } from 'msw';
import type { ApiErrorBody, ApiErrorCode } from '@/shared/api/contracts';

export const CHAOS_STORAGE_KEY = 'portfolio-terminal:chaos';

export interface NetworkSettings {
  /** Диапазон задержки ответа, мс; `null` — без задержки (тесты). */
  latency: { min: number; max: number } | null;
  /** Доля GET-запросов, которые в режиме хаоса отвечают 500. */
  chaosRate: number;
  isChaosEnabled: () => boolean;
  random: () => number;
}

function readChaosFlag(): boolean {
  try {
    return localStorage.getItem(CHAOS_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Режим хаоса выключен по умолчанию; включается `?chaos=1` или переключателем в настройках. */
export function setChaosEnabled(enabled: boolean): void {
  try {
    if (enabled) localStorage.setItem(CHAOS_STORAGE_KEY, '1');
    else localStorage.removeItem(CHAOS_STORAGE_KEY);
  } catch {
    // Без localStorage режим просто не переживёт перезагрузку.
  }
}

export function isChaosEnabled(): boolean {
  return readChaosFlag();
}

/** `?chaos=1` / `?chaos=0` в адресе при загрузке включает или выключает режим (и запоминает выбор). */
export function syncChaosFromUrl(search: string): void {
  const flag = new URLSearchParams(search).get('chaos');
  if (flag === '1' || flag === '0') setChaosEnabled(flag === '1');
}

export const browserNetworkSettings: NetworkSettings = {
  latency: { min: 200, max: 700 },
  chaosRate: 0.15,
  isChaosEnabled,
  random: Math.random,
};

export function errorResponse(
  status: number,
  code: ApiErrorCode,
  extra: Omit<ApiErrorBody, 'code'> = {},
) {
  return HttpResponse.json<ApiErrorBody>({ code, ...extra }, { status });
}

async function simulateNetwork(
  settings: NetworkSettings,
  request: Request,
): Promise<Response | null> {
  if (settings.latency) {
    const { min, max } = settings.latency;
    await delay(Math.round(min + (max - min) * settings.random()));
  }
  if (
    request.method === 'GET' &&
    settings.isChaosEnabled() &&
    settings.random() < settings.chaosRate
  ) {
    return errorResponse(500, 'internal_error');
  }
  return null;
}

export interface RouteContext<P extends PathParams> {
  request: Request;
  params: P;
  url: URL;
}

type RouteHandler<P extends PathParams> = (ctx: RouteContext<P>) => Response | Promise<Response>;

/** Обёртки над `http.*`: задержка и режим хаоса применяются к каждому маршруту одинаково. */
export function createRouter(settings: NetworkSettings) {
  const wrap =
    <P extends PathParams>(handler: RouteHandler<P>) =>
    async ({ request, params }: { request: Request; params: P }) =>
      (await simulateNetwork(settings, request)) ??
      handler({ request, params, url: new URL(request.url) });

  return {
    get: <P extends PathParams = PathParams>(path: string, handler: RouteHandler<P>) =>
      http.get<P>(path, wrap(handler)),
    post: <P extends PathParams = PathParams>(path: string, handler: RouteHandler<P>) =>
      http.post<P>(path, wrap(handler)),
    put: <P extends PathParams = PathParams>(path: string, handler: RouteHandler<P>) =>
      http.put<P>(path, wrap(handler)),
    delete: <P extends PathParams = PathParams>(path: string, handler: RouteHandler<P>) =>
      http.delete<P>(path, wrap(handler)),
  };
}

export type Router = ReturnType<typeof createRouter>;
