import { CircuitBreaker } from '../lib/circuitBreaker.js';
import { NotFoundError, UpstreamError } from '../lib/errors.js';
import { Semaphore } from '../lib/semaphore.js';

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const MAX_RETRY_AFTER_MS = 2000;

/**
 * Thin, defensive HTTP client for TMDB. Everything that can go wrong with a third-party API is
 * handled here so the rest of the backend only ever sees either parsed JSON or a typed error:
 *
 *  - timeout           : every attempt is aborted after `timeoutMs`
 *  - retries           : network errors, timeouts, 5xx and 429 are retried with exponential backoff + jitter
 *                        (429 honours the Retry-After header, capped)
 *  - concurrency limit : at most `maxConcurrent` requests are in flight; the rest queue up, which keeps us
 *                        well below TMDB's rate limit even when many users hit the API at once
 *  - circuit breaker   : after repeated failures we fail fast instead of piling up doomed requests
 *  - typed errors      : 404 -> NotFoundError; everything else -> UpstreamError(retryable?)
 */
export function createTmdbClient({
  apiKey,
  baseUrl,
  timeoutMs = 8000,
  maxRetries = 2,
  maxConcurrent = 8,
  fetchImpl = globalThis.fetch,
  sleep = defaultSleep,
  breaker = new CircuitBreaker(),
}) {
  const limiter = new Semaphore(maxConcurrent);
  // TMDB issues two credentials: a short v3 API key (query param) and a long v4 JWT (Bearer token).
  const useBearer = apiKey.length > 40;

  function buildRequest(path, params) {
    const url = new URL(`${baseUrl}${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }
    const headers = { Accept: 'application/json' };
    if (useBearer) headers.Authorization = `Bearer ${apiKey}`;
    else url.searchParams.set('api_key', apiKey);
    return { url, headers };
  }

  async function attempt(url, headers) {
    let res;
    try {
      res = await fetchImpl(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
    } catch (err) {
      if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
        throw new UpstreamError(504, 'UPSTREAM_TIMEOUT', 'The movie service took too long to respond.');
      }
      throw new UpstreamError(502, 'UPSTREAM_UNREACHABLE', 'Could not reach the movie service.');
    }

    if (res.ok) {
      try {
        return await res.json();
      } catch {
        throw new UpstreamError(502, 'UPSTREAM_BAD_RESPONSE', 'The movie service returned an unreadable response.');
      }
    }

    await res.text().catch(() => ''); // release the connection

    if (res.status === 404) throw new NotFoundError('Movie not found.');
    if (res.status === 429) {
      const retryAfter = Number.parseFloat(res.headers.get('retry-after') ?? '');
      throw new UpstreamError(503, 'UPSTREAM_RATE_LIMITED', 'The movie service is busy. Please try again in a moment.', {
        retryAfterMs: Number.isFinite(retryAfter) ? Math.round(retryAfter * 1000) : undefined,
      });
    }
    if (res.status === 401 || res.status === 403) {
      throw new UpstreamError(502, 'UPSTREAM_AUTH', 'The movie service rejected our credentials.', { retryable: false });
    }
    if (res.status >= 500) {
      throw new UpstreamError(502, 'UPSTREAM_ERROR', 'The movie service had an internal error.');
    }
    throw new UpstreamError(502, 'UPSTREAM_REJECTED', `The movie service rejected the request (${res.status}).`, {
      retryable: false,
    });
  }

  async function withRetries(url, headers) {
    for (let i = 0; ; i += 1) {
      try {
        return await attempt(url, headers);
      } catch (err) {
        const canRetry = err instanceof UpstreamError && err.retryable && i < maxRetries;
        if (!canRetry) throw err;
        const backoff =
          err.retryAfterMs != null
            ? Math.min(err.retryAfterMs, MAX_RETRY_AFTER_MS)
            : Math.round(200 * 2 ** i + Math.random() * 100);
        await sleep(backoff);
      }
    }
  }

  /**
   * @param {string} path   e.g. "/discover/movie"
   * @param {Record<string, unknown>} params  undefined / empty values are dropped
   */
  async function get(path, params = {}) {
    if (!breaker.canRequest()) {
      throw new UpstreamError(
        503,
        'UPSTREAM_UNAVAILABLE',
        'The movie service is temporarily unavailable. Please try again shortly.',
      );
    }
    const { url, headers } = buildRequest(path, params);
    try {
      const data = await limiter.run(() => withRetries(url, headers));
      breaker.onSuccess();
      return data;
    } catch (err) {
      if (err instanceof UpstreamError && err.retryable) breaker.onFailure();
      else breaker.onNeutral();
      throw err;
    }
  }

  return { get, breaker };
}
