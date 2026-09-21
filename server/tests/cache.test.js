import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TTLCache } from '../src/lib/cache.js';

function clock(start = 1_000) {
  let t = start;
  return { now: () => t, advance: (ms) => (t += ms) };
}

test('returns cached value within TTL without calling the loader again', async () => {
  const c = clock();
  const cache = new TTLCache({ now: c.now });
  let calls = 0;
  const loader = async () => ++calls;

  assert.deepEqual(await cache.getOrLoad('k', loader, { ttlMs: 100 }), { value: 1, stale: false });
  c.advance(99);
  assert.deepEqual(await cache.getOrLoad('k', loader, { ttlMs: 100 }), { value: 1, stale: false });
  c.advance(2);
  assert.deepEqual(await cache.getOrLoad('k', loader, { ttlMs: 100 }), { value: 2, stale: false });
  assert.equal(calls, 2);
});

test('coalesces concurrent requests for the same key into one load', async () => {
  const cache = new TTLCache();
  let calls = 0;
  const loader = async () => {
    calls += 1;
    await new Promise((r) => setTimeout(r, 10));
    return 'value';
  };
  const results = await Promise.all([1, 2, 3, 4, 5].map(() => cache.getOrLoad('k', loader, { ttlMs: 1000 })));
  assert.equal(calls, 1);
  assert.ok(results.every((r) => r.value === 'value'));
});

test('serves an expired entry (flagged stale) when the loader fails', async () => {
  const c = clock();
  const cache = new TTLCache({ now: c.now });
  await cache.getOrLoad('k', async () => 'old', { ttlMs: 100, staleTtlMs: 1000 });
  c.advance(500);
  const res = await cache.getOrLoad('k', async () => { throw new Error('boom'); }, { ttlMs: 100, staleTtlMs: 1000 });
  assert.deepEqual(res, { value: 'old', stale: true });
});

test('does not serve stale data past the stale window, or when staleIf rejects the error', async () => {
  const c = clock();
  const cache = new TTLCache({ now: c.now });
  await cache.getOrLoad('k', async () => 'old', { ttlMs: 100, staleTtlMs: 1000 });

  c.advance(500);
  await assert.rejects(
    cache.getOrLoad('k', async () => { throw new Error('not-found'); }, { ttlMs: 100, staleTtlMs: 1000, staleIf: () => false }),
    /not-found/,
  );

  c.advance(5000);
  await assert.rejects(
    cache.getOrLoad('k', async () => { throw new Error('boom'); }, { ttlMs: 100, staleTtlMs: 1000 }),
    /boom/,
  );
});

test('does not cache failures and lets the next call retry', async () => {
  const cache = new TTLCache();
  let calls = 0;
  const flaky = async () => {
    calls += 1;
    if (calls === 1) throw new Error('first fails');
    return 'ok';
  };
  await assert.rejects(cache.getOrLoad('k', flaky, { ttlMs: 1000 }));
  assert.equal((await cache.getOrLoad('k', flaky, { ttlMs: 1000 })).value, 'ok');
});

test('evicts the least recently used entry beyond maxEntries', async () => {
  const cache = new TTLCache({ maxEntries: 2 });
  await cache.getOrLoad('a', async () => 'A', { ttlMs: 1000 });
  await cache.getOrLoad('b', async () => 'B', { ttlMs: 1000 });
  await cache.getOrLoad('a', async () => 'A2', { ttlMs: 1000 }); // touch a -> b is now oldest
  await cache.getOrLoad('c', async () => 'C', { ttlMs: 1000 });
  assert.equal(cache.size, 2);
  assert.equal((await cache.getOrLoad('a', async () => 'new-a', { ttlMs: 1000 })).value, 'A');
  assert.equal((await cache.getOrLoad('b', async () => 'new-b', { ttlMs: 1000 })).value, 'new-b');
});
