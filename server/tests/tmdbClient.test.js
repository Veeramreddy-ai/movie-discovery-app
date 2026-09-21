import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, test } from 'node:test';
import { CircuitBreaker } from '../src/lib/circuitBreaker.js';
import { NotFoundError, UpstreamError } from '../src/lib/errors.js';
import { createTmdbClient } from '../src/services/tmdbClient.js';

let server;
let baseUrl;
let handler = (_req, res) => res.end('{}');
const seen = [];

before(async () => {
  server = http.createServer((req, res) => {
    seen.push({ url: req.url, headers: req.headers });
    handler(req, res);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/3`;
});
after(() => server.close());

const json = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'content-type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
};
const makeClient = (opts = {}) =>
  createTmdbClient({ apiKey: 'key', baseUrl, sleep: async () => {}, timeoutMs: 500, maxRetries: 2, ...opts });

test('sends the api key, drops empty params', async () => {
  seen.length = 0;
  handler = (_req, res) => json(res, 200, { ok: true });
  const data = await makeClient().get('/discover/movie', { page: 2, with_genres: undefined, year: '' });
  assert.deepEqual(data, { ok: true });
  const url = new URL(seen[0].url, 'http://x');
  assert.equal(url.searchParams.get('api_key'), 'key');
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(url.searchParams.has('with_genres'), false);
  assert.equal(url.searchParams.has('year'), false);
});

test('uses a Bearer header for long (v4) tokens', async () => {
  seen.length = 0;
  handler = (_req, res) => json(res, 200, {});
  await makeClient({ apiKey: 'x'.repeat(60) }).get('/x');
  assert.equal(seen[0].headers.authorization, `Bearer ${'x'.repeat(60)}`);
  assert.equal(new URL(seen[0].url, 'http://x').searchParams.has('api_key'), false);
});

test('retries 5xx and succeeds', async () => {
  let calls = 0;
  handler = (_req, res) => (++calls < 3 ? json(res, 500, {}) : json(res, 200, { ok: 1 }));
  assert.deepEqual(await makeClient().get('/x'), { ok: 1 });
  assert.equal(calls, 3);
});

test('gives up after maxRetries with a typed, retryable error', async () => {
  let calls = 0;
  handler = (_req, res) => { calls += 1; json(res, 503, {}); };
  await assert.rejects(makeClient().get('/x'), (e) => e instanceof UpstreamError && e.retryable && e.status === 502);
  assert.equal(calls, 3);
});

test('honours Retry-After on 429', async () => {
  const sleeps = [];
  let calls = 0;
  handler = (_req, res) => (++calls === 1 ? json(res, 429, {}, { 'retry-after': '1' }) : json(res, 200, { ok: 1 }));
  const client = makeClient({ sleep: async (ms) => sleeps.push(ms) });
  assert.deepEqual(await client.get('/x'), { ok: 1 });
  assert.deepEqual(sleeps, [1000]);
});

test('404 becomes NotFoundError and is not retried', async () => {
  let calls = 0;
  handler = (_req, res) => { calls += 1; json(res, 404, {}); };
  await assert.rejects(makeClient().get('/x'), NotFoundError);
  assert.equal(calls, 1);
});

test('bad credentials are not retried', async () => {
  let calls = 0;
  handler = (_req, res) => { calls += 1; json(res, 401, {}); };
  await assert.rejects(makeClient().get('/x'), (e) => e.code === 'UPSTREAM_AUTH' && e.retryable === false);
  assert.equal(calls, 1);
});

test('unreadable JSON becomes UPSTREAM_BAD_RESPONSE', async () => {
  handler = (_req, res) => { res.writeHead(200); res.end('<html>oops</html>'); };
  await assert.rejects(makeClient({ maxRetries: 0 }).get('/x'), (e) => e.code === 'UPSTREAM_BAD_RESPONSE');
});

test('times out slow responses', async () => {
  handler = () => {}; // never answers
  await assert.rejects(makeClient({ timeoutMs: 50, maxRetries: 0 }).get('/x'), (e) => e.code === 'UPSTREAM_TIMEOUT' && e.status === 504);
});

test('circuit breaker opens after repeated failures and fails fast', async () => {
  let calls = 0;
  handler = (_req, res) => { calls += 1; json(res, 500, {}); };
  const breaker = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 60_000 });
  const client = makeClient({ breaker, maxRetries: 0 });
  await assert.rejects(client.get('/x'));
  await assert.rejects(client.get('/x'));
  assert.equal(breaker.state, 'open');
  const before = calls;
  await assert.rejects(client.get('/x'), (e) => e.code === 'UPSTREAM_UNAVAILABLE');
  assert.equal(calls, before, 'no request should reach the upstream while the circuit is open');
});

test('circuit breaker half-opens after the cooldown and closes on success', async () => {
  let t = 0;
  const breaker = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 1000, now: () => t });
  handler = (_req, res) => json(res, 500, {});
  const client = makeClient({ breaker, maxRetries: 0 });
  await assert.rejects(client.get('/x'));
  assert.equal(breaker.state, 'open');
  t = 1500;
  handler = (_req, res) => json(res, 200, { ok: true });
  assert.deepEqual(await client.get('/x'), { ok: true });
  assert.equal(breaker.state, 'closed');
});

test('limits concurrent upstream requests', async () => {
  let active = 0;
  let peak = 0;
  handler = (_req, res) => {
    active += 1;
    peak = Math.max(peak, active);
    setTimeout(() => { active -= 1; json(res, 200, {}); }, 20);
  };
  const client = makeClient({ maxConcurrent: 2 });
  await Promise.all(Array.from({ length: 8 }, () => client.get('/x')));
  assert.equal(peak, 2);
});
