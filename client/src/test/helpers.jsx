import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import App from '../App.jsx';
import { ToastProvider } from '../components/ui/Toast.jsx';

export const movie = (id, extra = {}) => ({
  id,
  title: `Movie ${id}`,
  year: 2000 + (id % 20),
  rating: 7.5,
  poster: { w185: `/i/${id}-185.jpg`, w342: `/i/${id}-342.jpg`, w500: `/i/${id}-500.jpg` },
  ...extra,
});

export const page = (items, { page = 1, totalPages = 1, totalResults = items.length, meta = {} } = {}) => ({
  items,
  page,
  totalPages,
  totalResults,
  hasMore: page < totalPages,
  meta: { stale: false, totalIsApproximate: false, ordering: 'popularity.desc', ...meta },
});

export const json = (body, status = 200) =>
  Promise.resolve(new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

/**
 * Installs a fake `fetch`. `routes` maps "METHOD /api/path" (no query string) to a function
 * (url: URL, init) => Promise<Response>. Every call is recorded in `calls`.
 */
export function mockApi(routes) {
  const calls = [];
  const fetchMock = vi.fn((input, init = {}) => {
    const url = new URL(input, 'http://localhost');
    const method = (init.method ?? 'GET').toUpperCase();
    calls.push({ method, url, init });
    const handler = routes[`${method} ${url.pathname}`] ?? routes[`${method} ${url.pathname.replace(/\/\d+$/, '/:id')}`];
    if (!handler) return json({ error: { code: 'NOT_FOUND', message: `unmocked ${method} ${url.pathname}` } }, 404);
    return handler(url, init);
  });
  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock, callsTo: (path) => calls.filter((c) => c.url.pathname === path) };
}

export function renderApp(initialEntries = ['/']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

export const genres = { items: [{ id: 28, name: 'Action' }, { id: 35, name: 'Comedy' }, { id: 18, name: 'Drama' }], meta: { stale: false } };
