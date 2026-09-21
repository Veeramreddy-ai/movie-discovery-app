# Review notes: how to explain this project

## 60-second overview
React SPA -> Express API -> TMDB. The API validates, caches, retries, normalises. Wishlist lives in SQLite keyed by an
anonymous client id. The URL holds all browse state.

## Follow the data (browse request)
1. `BrowsePage` reads filters from the URL (`useBrowseFilters`).
2. `useMovies` builds a query key from the filters and calls `GET /api/movies` with an `AbortSignal`.
3. `routes/movies.js` -> `schemas.js` validates (400 on bad input).
4. `movieService.listMovies` builds a canonical cache key -> `TTLCache.getOrLoad`.
5. Cache miss -> `tmdbClient.get`: circuit breaker check -> concurrency semaphore -> fetch with timeout -> retry/backoff -> typed errors.
6. Raw payload is cached; `normalizers.toSummaries` shapes it; response goes back with `meta.stale`.

## Questions you may get, and the answers
- **Why a backend at all?** Hides the API key, lets us cache/coalesce/rate-limit, and gives the UI a stable, small contract
  independent of TMDB's shape.
- **Two users search the same thing at once?** Request coalescing: one TMDB call, both get the result (`lib/cache.js`, test "coalesces concurrent requests").
- **TMDB goes down?** Retries -> circuit breaker -> stale cache (flagged in UI) -> clean error with retry. Wishlist unaffected.
- **429?** Honour `Retry-After` (capped 2 s), cap concurrency at 8, cache aggressively, our own per-IP limit.
- **Why cache raw and not normalised?** Changing a normaliser never needs a cache flush.
- **User changes filters quickly?** Old requests are aborted; TanStack Query keys results by filters, so a stale response can't land in the new view.
- **Why is sort disabled while searching?** TMDB's search endpoint can't sort. Showing a control that silently does nothing is worse.
- **Why infinite scroll needs `enabled=false` while fetching?** A fresh IntersectionObserver reports the current state; that
  is what keeps loading if a page was too short to push the sentinel off-screen (`useInfiniteScroll.js`).
- **Wishlist without login?** Random UUID in localStorage sent as `X-Client-Id`. Convenience, not security; listed as a known limitation.
- **How would you scale it?** Redis cache, more instances behind a load balancer, Postgres instead of SQLite, accounts.
- **What would you do with more time?** See README "Future improvements".

## Where the tests are
- `server/tests/cache.test.js`: TTL, coalescing, stale-if-error, LRU
- `server/tests/tmdbClient.test.js`: retries, Retry-After, timeout, circuit breaker, concurrency (real local HTTP server)
- `server/tests/normalizers.test.js`: missing / malformed TMDB data
- `server/tests/api.test.js`: whole API with fake TMDB + in-memory SQLite
- `client/src/test/*.test.jsx`: search debounce, filters, infinite scroll, errors, wishlist optimistic update / rollback / undo, details page
