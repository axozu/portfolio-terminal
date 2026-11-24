import type { ApiErrorBody, ApiErrorCode } from './contracts';

export const API_PREFIX = '/api';

/** Ошибка ответа API с разобранным телом (ошибки полей, конфликт леджера). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly body: ApiErrorBody | null;

  constructor(status: number, body: ApiErrorBody | null) {
    super(`API request failed with status ${String(status)}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.code = body?.code ?? (status >= 500 ? 'internal_error' : 'bad_request');
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export type QueryParams = Record<string, string | number | undefined | null>;

interface RequestOptions {
  query?: QueryParams;
  body?: unknown;
  signal?: AbortSignal;
}

function buildUrl(path: string, query: QueryParams = {}): URL {
  const url = new URL(`${API_PREFIX}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '')
      url.searchParams.set(key, String(value));
  }
  return url;
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === 'object' && value !== null && 'code' in value;
}

async function send(method: string, path: string, options: RequestOptions): Promise<Response> {
  const response = await fetch(buildUrl(path, options.query), {
    method,
    signal: options.signal,
    headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw new ApiError(response.status, isErrorBody(body) ? body : null);
  }
  return response;
}

/**
 * Запрос с JSON-ответом. Тип ответа не проверяется в рантайме: API — наш собственный мок,
 * а его контракт общий с клиентом (`contracts.ts`) и проверяется компилятором.
 */
export async function requestJson<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await send(method, path, options);
  const data: unknown = await response.json();
  return data as T;
}

/** Запрос без тела ответа (204). */
export async function requestVoid(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<void> {
  await send(method, path, options);
}

export const http = {
  get: <T>(path: string, query?: QueryParams, signal?: AbortSignal) =>
    requestJson<T>('GET', path, { query, signal }),
  post: <T>(path: string, body?: unknown) => requestJson<T>('POST', path, { body }),
  put: <T>(path: string, body: unknown) => requestJson<T>('PUT', path, { body }),
  delete: (path: string) => requestVoid('DELETE', path),
  postVoid: (path: string) => requestVoid('POST', path),
};
