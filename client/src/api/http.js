import { getClientId } from '../utils/clientId.js';

const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'UNKNOWN', retryable = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

function buildUrl(path, params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  const qs = search.toString();
  return `${BASE_URL}/api${path}${qs ? `?${qs}` : ''}`;
}

/**
 * The single place the client talks to the network. It
 *  - accepts an AbortSignal (React Query aborts requests that are no longer needed)
 *  - converts every failure into an ApiError with a user-presentable message
 *  - attaches the anonymous client id only when asked (avoids CORS preflights on plain reads)
 */
export async function request(path, { method = 'GET', params, body, signal, withClientId = false } = {}) {
  const headers = { Accept: 'application/json' };
  if (withClientId) headers['X-Client-Id'] = getClientId();
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(buildUrl(path, params), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err; // cancelled on purpose, not a failure
    throw new ApiError('Could not reach the server. Check your connection and try again.', {
      code: 'NETWORK',
      retryable: true,
    });
  }

  if (res.status === 204) return null;

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    /* non-JSON body */
  }

  if (!res.ok) {
    const apiError = payload?.error;
    throw new ApiError(apiError?.message ?? `Request failed (${res.status}).`, {
      status: res.status,
      code: apiError?.code ?? 'HTTP_ERROR',
      retryable: apiError?.retryable ?? res.status >= 500,
    });
  }
  if (payload === null) {
    throw new ApiError('The server sent an unreadable response.', { status: res.status, code: 'BAD_RESPONSE', retryable: true });
  }
  return payload;
}
