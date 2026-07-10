import type { ApiErrorBody, ErrorCode } from '@flowos/shared';
import { useAuthStore } from '@/stores/auth-store';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const BASE = `${API_URL}/api/v1`;

export class ApiError extends Error {
  constructor(
    public readonly code: ErrorCode | 'NETWORK_ERROR',
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
  /** Skip Authorization header (auth endpoints). */
  anonymous?: boolean;
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = new URL(`${BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function parseError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return new ApiError(body.error.code, body.error.message, response.status, body.error.details);
  } catch {
    return new ApiError('INTERNAL', `Request failed with status ${response.status}`, response.status);
  }
}

/** Single-flight refresh so concurrent 401s trigger one rotation. */
let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const { refreshToken, setTokens, logout } = useAuthStore.getState();
      if (!refreshToken) return false;
      try {
        const response = await fetch(buildUrl('/auth/refresh'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!response.ok) {
          logout();
          return false;
        }
        const json = (await response.json()) as {
          data: { accessToken: string; refreshToken: string };
        };
        setTokens(json.data);
        return true;
      } catch {
        logout();
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

async function execute<T>(path: string, options: RequestOptions, retried: boolean): Promise<T> {
  const { accessToken } = useAuthStore.getState();
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken && !options.anonymous) headers.Authorization = `Bearer ${accessToken}`;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.params), {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('NETWORK_ERROR', 'Unable to reach the server.', 0);
  }

  if (response.status === 401 && !options.anonymous && !retried) {
    const refreshed = await tryRefresh();
    if (refreshed) return execute<T>(path, options, true);
    useAuthStore.getState().logout();
    throw new ApiError('AUTH_TOKEN_EXPIRED', 'Session expired. Please sign in again.', 401);
  }

  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  const json = (await response.json()) as { data: T };
  return json.data;
}

export const api = {
  get: <T>(path: string, params?: RequestOptions['params'], signal?: AbortSignal) =>
    execute<T>(path, { method: 'GET', params, signal }, false),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    execute<T>(path, { ...options, method: 'POST', body }, false),
  patch: <T>(path: string, body?: unknown) => execute<T>(path, { method: 'PATCH', body }, false),
  put: <T>(path: string, body?: unknown) => execute<T>(path, { method: 'PUT', body }, false),
  delete: <T>(path: string) => execute<T>(path, { method: 'DELETE' }, false),
};
