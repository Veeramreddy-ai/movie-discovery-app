import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/db/index.js';
import { createWishlistRepository } from '../src/db/wishlistRepository.js';
import { TTLCache } from '../src/lib/cache.js';
import { NotFoundError, UpstreamError } from '../src/lib/errors.js';
import { createMovieService } from '../src/services/movieService.js';
import { createNormalizers } from '../src/services/normalizers.js';

const CLIENT_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CLIENT_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const movie = (id, extra = {}) => ({
  id, title: `Movie ${id}`, release_date: '2020-01-01', vote_average: 7.5, vote_count: 100, poster_path: `/p${id}.jpg`, genre_ids: [28], ...extra,
});

let server;
let base;
let calls; // every request the fake TMDB received
let respond; // per-test override for the fake TMDB
let clock;

before(async () => {
  clock = { t: 1_000_000 };
  const tmdb = {
    async get(path, params) {
      calls.push({ path, params });
      return respond(path, params);
    },
  };
  const normalizers = createNormalizers({ imageBaseUrl: 'https://img.test/t/p' });
  const cacheConfig = { listTtlMs: 1000, detailTtlMs: 1000, genreTtlMs: 1000, staleTtlMs: 60_000 };
  const movieService = createMovieService({
    tmdb,
    cache: new TTLCache({ now: () => clock.t }),
    normalizers,
    cacheConfig,
    today: () => '2026-09-21',
  });
  const db = openDatabase(':memory:');
  const wishlistRepository = createWishlistRepository(db, { fromRow: normalizers.fromWishlistRow });
  const app = createApp({ movieService, wishlistRepository, logger: { info() {}, warn() {}, error() {} } });
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());

beforeEach(() => {
  calls = [];
  clock.t += 10_000_000; // expire everything cached by earlier tests
  respond = (path) => {
    if (path === '/discover/movie' || path === '/search/movie') return { page: 1, total_pages: 3, total_results: 55, results: [movie(1), movie(2)] };
    if (path === '/genre/movie/list') return { genres: [{ id: 28, name: 'Action' }] };
    if (path.startsWith('/movie/')) return { ...movie(Number(path.split('/')[2])), overview: 'Plot', credits: { cast: [], crew: [] } };
    throw new Error(`unexpected path ${path}`);
  };
});

const get = (path, headers = {}) => fetch(`${base}${path}`, { headers });
const send = (method, path, body, clientId = CLIENT_A) =>
  fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-client-id': clientId },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

test('GET /movies (browse) uses discover, normalises the shape and reports pagination', async () => {
  const res = await get('/movies?genres=12,28&sort=vote_average.desc&year=2020&page=1');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.items.length, 2);
  assert.deepEqual(Object.keys(body.items[0]).sort(), ['id', 'poster', 'rating', 'title', 'year']);
  assert.equal(body.hasMore, true);
  assert.equal(body.totalPages, 3);
  assert.equal(body.meta.stale, false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, '/discover/movie');
  assert.equal(calls[0].params.with_genres, '12,28');
  assert.equal(calls[0].params.sort_by, 'vote_average.desc');
  assert.equal(calls[0].params['vote_count.gte'], 300); // guards "top rated" against 1-vote movies
  assert.equal(calls[0].params.primary_release_year, 2020);
});

test('"newest" sort excludes unreleased titles', async () => {
  await get('/movies?sort=primary_release_date.desc');
  assert.equal(calls[0].params['primary_release_date.lte'], '2026-09-21');
});

test('caps total pages at TMDB\'s 500-page limit', async () => {
  respond = () => ({ page: 1, total_pages: 42_000, total_results: 840_000, results: [movie(1)] });
  const body = await (await get('/movies')).json();
  assert.equal(body.totalPages, 500);
  const last = await (await get('/movies?page=500')).json();
  assert.equal(last.hasMore, false);
});

test('search mode uses /search/movie, ignores sort and post-filters by genre', async () => {
  respond = () => ({
    page: 1, total_pages: 2, total_results: 40,
    results: [movie(1, { genre_ids: [28, 12] }), movie(2, { genre_ids: [35] }), movie(3, { genre_ids: [28] })],
  });
  const body = await (await get('/movies?query=%20%20the%20%20matrix%20&genres=28&sort=revenue.desc')).json();
  assert.equal(calls[0].path, '/search/movie');
  assert.equal(calls[0].params.query, 'the matrix');
  assert.equal(calls[0].params.sort_by, undefined);
  assert.deepEqual(body.items.map((m) => m.id), [1, 3]);
  assert.equal(body.meta.ordering, 'relevance');
  assert.equal(body.meta.totalIsApproximate, true);
});

test('identical requests hit TMDB once (cache), equivalent ones share a cache entry', async () => {
  await get('/movies?genres=12,28');
  await get('/movies?genres=28,12'); // same set, different order -> same canonical key
  await get('/movies?genres=28,12&sort=popularity.desc'); // explicit default
  assert.equal(calls.length, 1);
});

test('concurrent identical requests are coalesced into one upstream call', async () => {
  respond = async () => {
    await new Promise((r) => setTimeout(r, 30));
    return { page: 1, total_pages: 1, total_results: 1, results: [movie(9)] };
  };
  await Promise.all(Array.from({ length: 6 }, () => get('/movies?query=coalesce')));
  assert.equal(calls.length, 1);
});

test('rejects invalid parameters with a 400 and per-field details', async () => {
  for (const qs of ['sort=nope', 'page=0', 'page=501', 'genres=abc', 'year=1500', 'minRating=11', 'page=1&page=2']) {
    const res = await get(`/movies?${qs}`);
    assert.equal(res.status, 400, qs);
    const { error } = await res.json();
    assert.equal(error.code, 'VALIDATION_ERROR');
  }
  assert.equal(calls.length, 0, 'invalid requests must never reach TMDB');
});

test('upstream failure with nothing cached -> clean 503 JSON error', async () => {
  respond = () => { throw new UpstreamError(503, 'UPSTREAM_UNAVAILABLE', 'down'); };
  const res = await get('/movies');
  assert.equal(res.status, 503);
  const { error } = await res.json();
  assert.equal(error.code, 'UPSTREAM_UNAVAILABLE');
  assert.equal(error.retryable, true);
});

test('upstream failure after a successful fetch -> serves stale data flagged as stale', async () => {
  const ok = await (await get('/movies?query=stale-test')).json();
  assert.equal(ok.meta.stale, false);
  clock.t += 5_000; // TTL (1s) expired, still inside the stale window (60s)
  respond = () => { throw new UpstreamError(502, 'UPSTREAM_ERROR', 'boom'); };
  const res = await get('/movies?query=stale-test');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.meta.stale, true);
  assert.deepEqual(body.items, ok.items);
});

test('malformed upstream payloads are rejected instead of cached', async () => {
  respond = () => 'not an object';
  const res = await get('/movies?query=garbage');
  assert.equal(res.status, 502);
  respond = () => ({ results: [{ nonsense: true }, movie(5)], total_pages: 'x' });
  const body = await (await get('/movies?query=garbage')).json();
  assert.deepEqual(body.items.map((m) => m.id), [5]);
  assert.equal(body.totalPages, 0);
  assert.equal(body.hasMore, false);
});

test('GET /movies/:id returns detail; unknown id -> 404; bad id -> 400', async () => {
  const ok = await get('/movies/42');
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).overview, 'Plot');

  respond = () => { throw new NotFoundError('nope'); };
  assert.equal((await get('/movies/999999')).status, 404);
  assert.equal((await get('/movies/abc')).status, 400);
});

test('GET /genres', async () => {
  const body = await (await get('/genres')).json();
  assert.deepEqual(body.items, [{ id: 28, name: 'Action' }]);
});

test('unknown API route -> JSON 404', async () => {
  const res = await get('/nope');
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error.code, 'NOT_FOUND');
});

test('wishlist: requires a client id', async () => {
  assert.equal((await get('/wishlist')).status, 400);
  assert.equal((await get('/wishlist', { 'x-client-id': 'short' })).status, 400);
});

test('wishlist: add, list (newest first), idempotent add, remove, idempotent remove', async () => {
  const add1 = await send('POST', '/wishlist', { movieId: 11 });
  assert.equal(add1.status, 201);
  const { item } = await add1.json();
  assert.equal(item.id, 11);
  assert.equal(item.title, 'Movie 11');
  assert.ok(item.poster.w342.endsWith('/w342/p11.jpg'));

  await send('POST', '/wishlist', { movieId: 12 });
  await send('POST', '/wishlist', { movieId: 11 }); // duplicate
  const list = await (await send('GET', '/wishlist')).json();
  assert.equal(list.total, 2);
  assert.deepEqual(list.items.map((m) => m.id).sort(), [11, 12]);

  assert.equal((await send('DELETE', '/wishlist/11')).status, 204);
  assert.equal((await send('DELETE', '/wishlist/11')).status, 204);
  assert.deepEqual((await (await send('GET', '/wishlist')).json()).items.map((m) => m.id), [12]);
});

test('wishlist: entries are private to each client id', async () => {
  await send('POST', '/wishlist', { movieId: 21 }, CLIENT_A);
  await send('POST', '/wishlist', { movieId: 22 }, CLIENT_B);
  const a = await (await send('GET', '/wishlist', undefined, CLIENT_A)).json();
  const b = await (await send('GET', '/wishlist', undefined, CLIENT_B)).json();
  assert.ok(a.items.some((m) => m.id === 21) && !a.items.some((m) => m.id === 22));
  assert.ok(b.items.some((m) => m.id === 22) && !b.items.some((m) => m.id === 21));
});

test('wishlist: validates the body and surfaces upstream problems', async () => {
  assert.equal((await send('POST', '/wishlist', { movieId: 'x' })).status, 400);
  assert.equal((await send('POST', '/wishlist', {})).status, 400);
  const bad = await fetch(`${base}/wishlist`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-client-id': CLIENT_A }, body: '{oops' });
  assert.equal(bad.status, 400);

  respond = () => { throw new NotFoundError('gone'); };
  assert.equal((await send('POST', '/wishlist', { movieId: 31 })).status, 404);
  respond = () => { throw new UpstreamError(503, 'UPSTREAM_UNAVAILABLE', 'down'); };
  assert.equal((await send('POST', '/wishlist', { movieId: 32 })).status, 503);
});
