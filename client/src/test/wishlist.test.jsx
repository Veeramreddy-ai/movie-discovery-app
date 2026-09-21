import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { genres, json, mockApi, movie, page, renderApp } from './helpers.jsx';

const detail = (id, extra = {}) => ({
  ...movie(id),
  tagline: 'A tagline',
  overview: 'A long overview.',
  releaseDate: '2010-07-16',
  runtimeMinutes: 148,
  status: 'Released',
  originalLanguage: 'en',
  voteCount: 1234,
  homepage: null,
  genres: [{ id: 28, name: 'Action' }],
  backdrop: null,
  directors: ['Some Director'],
  cast: [{ id: 1, name: 'Lead Actor', character: 'Hero', profile: null }],
  trailer: { key: 'abc', name: 'Trailer', url: 'https://www.youtube.com/watch?v=abc' },
  recommendations: [movie(99)],
  meta: { stale: false },
  ...extra,
});

const routes = (overrides = {}) => ({
  'GET /api/genres': () => json(genres),
  'GET /api/wishlist': () => json({ items: [], total: 0 }),
  'GET /api/movies': () => json(page([movie(1), movie(2)])),
  ...overrides,
});

describe('Wishlist', () => {
  it('heart flips instantly (optimistic), calls POST with only the movie id, and sends the client id', async () => {
    let saved = [];
    const api = mockApi(
      routes({
        'GET /api/wishlist': () => json({ items: saved, total: saved.length }),
        'POST /api/wishlist': (_url, init) => {
          saved = [{ ...movie(JSON.parse(init.body).movieId), addedAt: '2026-01-01T00:00:00Z' }];
          return json({ item: {} }, 201);
        },
      }),
    );
    renderApp();
    const heart = await screen.findByRole('button', { name: 'Add Movie 1 to wishlist' });
    await userEvent.click(heart);

    expect(await screen.findByRole('button', { name: 'Remove Movie 1 from wishlist' })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(api.callsTo('/api/wishlist').some((c) => c.method === 'POST')).toBe(true));
    const post = api.calls.find((c) => c.method === 'POST');
    expect(JSON.parse(post.init.body)).toEqual({ movieId: 1 });
    expect(post.init.headers['X-Client-Id']).toMatch(/^[A-Za-z0-9-]{16,}$/);
  });

  it('rolls the heart back and shows a message when the server rejects the change', async () => {
    mockApi(
      routes({
        'POST /api/wishlist': () =>
          json({ error: { code: 'UPSTREAM_UNAVAILABLE', message: 'Service down', retryable: true } }, 503),
      }),
    );
    renderApp();
    await userEvent.click(await screen.findByRole('button', { name: 'Add Movie 1 to wishlist' }));

    expect(await screen.findByText(/Couldn't save "Movie 1"/)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Add Movie 1 to wishlist' })).toHaveAttribute('aria-pressed', 'false'),
    );
  });

  it('wishlist page lists saved movies, removing shows an Undo, and Undo restores it', async () => {
    let items = [
      { ...movie(5), addedAt: '2026-01-02T00:00:00Z' },
      { ...movie(6), addedAt: '2026-01-01T00:00:00Z' },
    ];
    mockApi(
      routes({
        'GET /api/wishlist': () => json({ items, total: items.length }),
        'DELETE /api/wishlist/:id': (url) => {
          const id = Number(url.pathname.split('/').pop());
          items = items.filter((i) => i.id !== id);
          return json(null, 204);
        },
        'POST /api/wishlist': (_url, init) => {
          const { movieId } = JSON.parse(init.body);
          items = [{ ...movie(movieId), addedAt: '2026-02-01T00:00:00Z' }, ...items];
          return json({ item: {} }, 201);
        },
      }),
    );
    renderApp(['/wishlist']);
    expect(await screen.findByRole('link', { name: /Movie 5/ })).toBeInTheDocument();
    expect(screen.getByText('2 movies')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Remove Movie 5 from wishlist' }));
    await waitFor(() => expect(screen.queryByRole('link', { name: /Movie 5/ })).not.toBeInTheDocument());

    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }));
    expect(await screen.findByRole('link', { name: /Movie 5/ })).toBeInTheDocument();
  });

  it('empty wishlist has a call to action', async () => {
    mockApi(routes());
    renderApp(['/wishlist']);
    expect(await screen.findByText('Your wishlist is empty')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse movies' })).toHaveAttribute('href', '/');
  });

  it('wishlist error state can be retried', async () => {
    let fail = true;
    mockApi(
      routes({
        'GET /api/wishlist': () =>
          fail ? json({ error: { code: 'INTERNAL_ERROR', message: 'Boom' } }, 500) : json({ items: [{ ...movie(8), addedAt: '2026-01-01T00:00:00Z' }], total: 1 }),
      }),
    );
    renderApp(['/wishlist']);
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load your wishlist");
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('link', { name: /Movie 8/ })).toBeInTheDocument();
  });
});

describe('Movie details', () => {
  it('renders the full detail view and links genres back to a filtered browse', async () => {
    mockApi(routes({ 'GET /api/movies/:id': () => json(detail(42)) }));
    renderApp(['/movie/42']);
    expect(await screen.findByRole('heading', { level: 1, name: 'Movie 42' })).toBeInTheDocument();
    expect(screen.getByText('A long overview.')).toBeInTheDocument();
    expect(screen.getByText('2h 28m')).toBeInTheDocument();
    expect(screen.getByText('Some Director')).toBeInTheDocument();
    expect(screen.getByText('Lead Actor')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Watch trailer' })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=abc');
    expect(screen.getByRole('link', { name: 'Action' })).toHaveAttribute('href', '/?genres=28');
    expect(screen.getByRole('button', { name: 'Add to wishlist' })).toBeInTheDocument();
  });

  it('copes with sparse data (no overview, no trailer, no cast, no rating)', async () => {
    mockApi(
      routes({
        'GET /api/movies/:id': () =>
          json(detail(7, { overview: null, tagline: null, trailer: null, cast: [], recommendations: [], directors: [], runtimeMinutes: null, rating: null, releaseDate: null, poster: null })),
      }),
    );
    renderApp(['/movie/7']);
    expect(await screen.findByText(/No overview is available/)).toBeInTheDocument();
    expect(screen.getByText('Not rated yet')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Watch trailer' })).not.toBeInTheDocument();
    expect(screen.queryByText('Cast')).not.toBeInTheDocument();
  });

  it('shows a friendly not-found view for unknown movies and invalid ids', async () => {
    mockApi(routes({ 'GET /api/movies/:id': () => json({ error: { code: 'NOT_FOUND', message: 'Movie not found.' } }, 404) }));
    renderApp(['/movie/999']);
    expect(await screen.findByText("We couldn't find that movie")).toBeInTheDocument();
  });

  it('shows an error with retry when the API fails', async () => {
    let fail = true;
    mockApi(
      routes({
        'GET /api/movies/:id': () =>
          fail ? json({ error: { code: 'UPSTREAM_TIMEOUT', message: 'Timed out', retryable: true } }, 504) : json(detail(3)),
      }),
    );
    renderApp(['/movie/3']);
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load this movie");
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Movie 3' })).toBeInTheDocument();
  });
});
