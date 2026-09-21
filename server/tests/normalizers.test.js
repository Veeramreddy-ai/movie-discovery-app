import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createNormalizers } from '../src/services/normalizers.js';

const n = createNormalizers({ imageBaseUrl: 'https://img.test/t/p' });

test('summary: maps a complete TMDB record', () => {
  const s = n.toSummary({
    id: 603, title: 'The Matrix', release_date: '1999-03-30', vote_average: 8.2345, vote_count: 25000, poster_path: '/m.jpg',
  });
  assert.deepEqual(s, {
    id: 603, title: 'The Matrix', year: 1999, rating: 8.2,
    poster: { w185: 'https://img.test/t/p/w185/m.jpg', w342: 'https://img.test/t/p/w342/m.jpg', w500: 'https://img.test/t/p/w500/m.jpg' },
  });
});

test('summary: survives missing / null / empty fields', () => {
  const s = n.toSummary({ id: 1, title: '   ', original_title: 'Original', release_date: '', vote_average: 0, vote_count: 0, poster_path: null });
  assert.equal(s.title, 'Original');
  assert.equal(s.year, null);
  assert.equal(s.rating, null); // 0 votes means "not rated", not "0.0"
  assert.equal(s.poster, null);
  assert.equal(n.toSummary({ id: 2 }).title, 'Untitled');
});

test('summary: rejects records without a usable id and tolerates garbage input', () => {
  assert.equal(n.toSummary({ title: 'No id' }), null);
  assert.equal(n.toSummary(null), null);
  assert.deepEqual(n.toSummaries([{ id: 1, title: 'A' }, { title: 'bad' }, null, 'x']).map((m) => m.id), [1]);
  assert.deepEqual(n.toSummaries(undefined), []);
});

test('summary: ignores malformed poster paths', () => {
  assert.equal(n.toSummary({ id: 1, title: 'x', poster_path: 'no-leading-slash.jpg' }).poster, null);
});

test('detail: builds cast, directors, trailer, recommendations', () => {
  const d = n.toDetail({
    id: 10, title: 'Film', runtime: 135, overview: 'Story', tagline: '', backdrop_path: '/b.jpg',
    genres: [{ id: 28, name: 'Action' }, { id: 'x', name: 'Bad' }],
    credits: {
      cast: [
        { id: 2, name: 'Second', order: 1, profile_path: null },
        { id: 1, name: 'First', order: 0, character: 'Hero', profile_path: '/p.jpg' },
        { id: 3, name: '' },
      ],
      crew: [{ job: 'Director', name: 'Dir A' }, { job: 'Director', name: 'Dir A' }, { job: 'Writer', name: 'W' }],
    },
    videos: { results: [
      { site: 'Vimeo', type: 'Trailer', key: 'v' },
      { site: 'YouTube', type: 'Teaser', key: 'teaser' },
      { site: 'YouTube', type: 'Trailer', key: 'trailer', official: false, name: 'T' },
    ] },
    recommendations: { results: [{ id: 11, title: 'Rec' }, { title: 'broken' }] },
  });
  assert.equal(d.runtimeMinutes, 135);
  assert.equal(d.tagline, null);
  assert.deepEqual(d.genres, [{ id: 28, name: 'Action' }]);
  assert.deepEqual(d.cast.map((c) => c.name), ['First', 'Second']);
  assert.equal(d.cast[0].profile, 'https://img.test/t/p/w185/p.jpg');
  assert.deepEqual(d.directors, ['Dir A']);
  assert.equal(d.trailer.key, 'trailer');
  assert.equal(d.trailer.url, 'https://www.youtube.com/watch?v=trailer');
  assert.deepEqual(d.recommendations.map((r) => r.id), [11]);
  assert.ok(d.backdrop.w1280.endsWith('/w1280/b.jpg'));
});

test('detail: minimal payload still yields a complete shape', () => {
  const d = n.toDetail({ id: 5, title: 'Bare' });
  assert.equal(d.overview, null);
  assert.equal(d.runtimeMinutes, null);
  assert.equal(d.trailer, null);
  assert.deepEqual(d.cast, []);
  assert.deepEqual(d.genres, []);
  assert.deepEqual(d.recommendations, []);
  assert.equal(d.backdrop, null);
});

test('wishlist record round trip', () => {
  const rec = n.toWishlistRecord({ id: 7, title: 'Seven', release_date: '1995-09-22', vote_average: 8.4, vote_count: 10, poster_path: '/s.jpg' });
  assert.deepEqual(rec, { movieId: 7, title: 'Seven', year: 1995, rating: 8.4, posterPath: '/s.jpg' });
  const item = n.fromWishlistRow({ movie_id: 7, title: 'Seven', poster_path: '/s.jpg', release_year: 1995, vote_average: 8.4, added_at: '2026-01-01T00:00:00.000Z' });
  assert.equal(item.id, 7);
  assert.ok(item.poster.w342.endsWith('/w342/s.jpg'));
  assert.equal(item.addedAt, '2026-01-01T00:00:00.000Z');
});
