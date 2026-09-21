/**
 * Small in-memory cache with three behaviours that matter for a third-party API:
 *
 *  1. TTL            - fresh entries are returned without touching the upstream.
 *  2. Request coalescing - concurrent requests for the same key share ONE upstream call.
 *  3. Stale-if-error - if the loader fails, an expired entry (within `staleTtlMs`) is served instead
 *                      of an error, and flagged as `stale` so the UI can say so.
 *
 * Bounded by `maxEntries` (least recently used entry is evicted first) so memory cannot grow forever.
 */
export class TTLCache {
  #store = new Map();
  #inflight = new Map();
  #maxEntries;
  #now;

  constructor({ maxEntries = 500, now = Date.now } = {}) {
    this.#maxEntries = maxEntries;
    this.#now = now;
  }

  get size() {
    return this.#store.size;
  }

  /**
   * @returns {Promise<{ value: any, stale: boolean }>}
   */
  async getOrLoad(key, loader, { ttlMs, staleTtlMs = 0, staleIf = () => true }) {
    const now = this.#now();
    const entry = this.#store.get(key);

    if (entry && entry.freshUntil > now) {
      this.#touch(key, entry);
      return { value: entry.value, stale: false };
    }

    const pending = this.#inflight.get(key);
    if (pending) return pending;

    const promise = (async () => {
      try {
        const value = await loader();
        this.#set(key, value, ttlMs, staleTtlMs);
        return { value, stale: false };
      } catch (err) {
        if (entry && entry.staleUntil > this.#now() && staleIf(err)) {
          return { value: entry.value, stale: true };
        }
        throw err;
      } finally {
        this.#inflight.delete(key);
      }
    })();

    this.#inflight.set(key, promise);
    return promise;
  }

  clear() {
    this.#store.clear();
    this.#inflight.clear();
  }

  #set(key, value, ttlMs, staleTtlMs) {
    const now = this.#now();
    this.#store.delete(key);
    this.#store.set(key, {
      value,
      freshUntil: now + ttlMs,
      staleUntil: now + ttlMs + staleTtlMs,
    });
    while (this.#store.size > this.#maxEntries) {
      const oldest = this.#store.keys().next().value;
      this.#store.delete(oldest);
    }
  }

  #touch(key, entry) {
    // Map preserves insertion order, so re-inserting marks the entry as most recently used.
    this.#store.delete(key);
    this.#store.set(key, entry);
  }
}
