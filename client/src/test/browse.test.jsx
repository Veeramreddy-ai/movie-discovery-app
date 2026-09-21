import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { genres, json, mockApi, movie, page, renderApp } from './helpers.jsx';

const baseRoutes = (overrides = {}) => ({
  'GET /api/genres': () => json(genres),
  'GET /api/wishlist': () => json({ items: [], total: 0 }),
  'GET /api/movies': () => json(page([movie(1), movie(2), movie(3)], { totalResults: 3 })),
  ...overrides,
});

describe('Browse page', () => {
  it('shows skeletons, then the movie grid with genres and a result count', async () => {
    mockApi(baseRoutes());
    renderApp();

    expect(await screen.findByRole('link', { name: /Movie 1/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Movie 3/ })).toBeInTheDocument();
    expect(screen.getByText('3 movies')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Comedy' })).toBeInTheDocument();
  });

  it('debounces typing into ONE search request and puts the query in the results heading', async () => {
    const api = mockApi(baseRoutes());
    renderApp();
    await screen.findByRole('link', { name: /Movie 1/ });
    const before = api.callsTo('/api/movies').length;

    await userEvent.type(screen.getByRole('searchbox'), 'matrix');
    await waitFor(() => expect(api.callsTo('/api/movies').length).toBe(before + 1));
    const last = api.callsTo('/api/movies').at(-1);
    expect(last.url.searchParams.get('query')).toBe('matrix');
    expect(await screen.findByRole('heading', { name: /Results for .matrix./ })).toBeInTheDocument();
    // "sort" is not offered while searching
    expect(screen.getByLabelText('Sort by')).toBeDisabled();
  });

  it('toggling genres and sort sends them to the API and keeps them in the URL-driven UI', async () => {
    const api = mockApi(baseRoutes());
    renderApp();
    await screen.findByRole('link', { name: /Movie 1/ });

    await userEvent.click(await screen.findByRole('button', { name: 'Comedy' }));
    await waitFor(() => expect(api.callsTo('/api/movies').at(-1).url.searchParams.get('genres')).toBe('35'));
    expect(screen.getByRole('button', { name: 'Comedy' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'All genres' })).toHaveAttribute('aria-pressed', 'false');

    await userEvent.selectOptions(screen.getByLabelText('Sort by'), 'vote_average.desc');
    await waitFor(() => expect(api.callsTo('/api/movies').at(-1).url.searchParams.get('sort')).toBe('vote_average.desc'));

    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'All genres' })).toHaveAttribute('aria-pressed', 'true'));
  });

  it('reads initial filters from the URL', async () => {
    const api = mockApi(baseRoutes());
    renderApp(['/?q=alien&genres=28&year=1986&minRating=7']);
    await screen.findByRole('link', { name: /Movie 1/ });
    const params = api.callsTo('/api/movies')[0].url.searchParams;
    expect(params.get('query')).toBe('alien');
    expect(params.get('genres')).toBe('28');
    expect(params.get('year')).toBe('1986');
    expect(params.get('minRating')).toBe('7');
    expect(screen.getByRole('searchbox')).toHaveValue('alien');
  });

  it('shows an empty state with a way out', async () => {
    mockApi(baseRoutes({ 'GET /api/movies': () => json(page([], { totalResults: 0 })) }));
    renderApp(['/?q=zzzz']);
    expect(await screen.findByText('No movies match')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear search and filters' }));
    await waitFor(() => expect(screen.getByRole('searchbox')).toHaveValue(''));
  });

  it('shows an error state and recovers when the user retries', async () => {
    let fail = true;
    mockApi(
      baseRoutes({
        'GET /api/movies': () =>
          fail
            ? json({ error: { code: 'UPSTREAM_UNAVAILABLE', message: 'The movie service is temporarily unavailable.', retryable: true } }, 503)
            : json(page([movie(7)])),
      }),
    );
    renderApp();
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load movies");
    expect(screen.getByRole('alert')).toHaveTextContent('temporarily unavailable');

    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('link', { name: /Movie 7/ })).toBeInTheDocument();
  });

  it('tells the user when the API is serving stale data', async () => {
    mockApi(baseRoutes({ 'GET /api/movies': () => json(page([movie(1)], { meta: { stale: true } })) }));
    renderApp();
    expect(await screen.findByText(/recently saved results/)).toBeInTheDocument();
  });

  it('handles a network failure with a readable message', async () => {
    mockApi(baseRoutes());
    global.fetch.mockImplementation((input) => {
      if (String(input).includes('/api/movies')) return Promise.reject(new TypeError('Failed to fetch'));
      return json(String(input).includes('genres') ? genres : { items: [], total: 0 });
    });
    renderApp();
    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not reach the server/);
  });
});

describe('Infinite scroll', () => {
  function installObserver() {
    const observers = [];
    class FakeObserver {
      constructor(cb) { this.cb = cb; this.active = true; observers.push(this); }
      observe() {}
      disconnect() { this.active = false; }
      trigger() { this.cb([{ isIntersecting: true }]); }
    }
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    return { fire: () => observers.filter((o) => o.active).forEach((o) => o.trigger()) };
  }

  it('loads the next page when the sentinel becomes visible, de-duplicates, and ends cleanly', async () => {
    const io = installObserver();
    const api = mockApi(
      baseRoutes({
        'GET /api/movies': (url) => {
          const p = Number(url.searchParams.get('page') ?? 1);
          return json(
            p === 1
              ? page([movie(1), movie(2)], { page: 1, totalPages: 2, totalResults: 4 })
              : page([movie(2), movie(3)], { page: 2, totalPages: 2, totalResults: 4 }), // movie 2 repeats across pages
          );
        },
      }),
    );
    renderApp();
    await screen.findByRole('link', { name: /Movie 1/ });
    expect(screen.queryByRole('link', { name: /Movie 3/ })).not.toBeInTheDocument();

    io.fire();
    expect(await screen.findByRole('link', { name: /Movie 3/ })).toBeInTheDocument();
    expect(api.callsTo('/api/movies').at(-1).url.searchParams.get('page')).toBe('2');
    expect(screen.getAllByRole('link', { name: /Movie 2/ })).toHaveLength(1); // duplicate dropped
    expect(screen.getByText(/reached the end/)).toBeInTheDocument();
  });

  it('shows an inline error with retry when a later page fails, keeping earlier results', async () => {
    const io = installObserver();
    let failPage2 = true;
    mockApi(
      baseRoutes({
        'GET /api/movies': (url) => {
          const p = Number(url.searchParams.get('page') ?? 1);
          if (p === 2 && failPage2) return json({ error: { code: 'UPSTREAM_ERROR', message: 'Upstream exploded', retryable: true } }, 502);
          return json(p === 1 ? page([movie(1)], { page: 1, totalPages: 2 }) : page([movie(2)], { page: 2, totalPages: 2 }));
        },
      }),
    );
    renderApp();
    await screen.findByRole('link', { name: /Movie 1/ });
    io.fire();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't load more movies");
    expect(screen.getByRole('link', { name: /Movie 1/ })).toBeInTheDocument();

    failPage2 = false;
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('link', { name: /Movie 2/ })).toBeInTheDocument();
  });

  it('offers a "Load more" button as a fallback', async () => {
    installObserver();
    const api = mockApi(
      baseRoutes({
        'GET /api/movies': (url) => {
          const p = Number(url.searchParams.get('page') ?? 1);
          return json(page([movie(p)], { page: p, totalPages: 3 }));
        },
      }),
    );
    renderApp();
    await screen.findByRole('link', { name: /Movie 1/ });
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(await screen.findByRole('link', { name: /Movie 2/ })).toBeInTheDocument();
    expect(api.callsTo('/api/movies')).toHaveLength(2);
  });
});
