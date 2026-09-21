import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { ApiError } from '../api/http.js';
import { fetchGenres, fetchMovie, fetchMovies } from '../api/movies.js';

/**
 * Infinite list of movies for the current filters.
 *
 * - Query key = the filters, so identical filters reuse the cache (going back to a previous filter is instant).
 * - React Query passes an AbortSignal to the fetch: when the filters change mid-request the old request
 *   is cancelled and its result can never overwrite the newer one (no race conditions).
 * - keepPreviousData: while new filters load, the old grid stays visible (dimmed) instead of flashing empty.
 */
export function useMovies(filters) {
  // The server ignores `sort` when searching, so don't create a separate cache entry per sort while searching.
  const apiFilters = filters.query ? { ...filters, sort: undefined } : filters;

  const query = useInfiniteQuery({
    queryKey: ['movies', apiFilters],
    queryFn: ({ pageParam, signal }) => fetchMovies({ ...apiFilters, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    placeholderData: keepPreviousData,
    // Data the server flagged as stale (TMDB was down) must be re-checked on the next chance.
    staleTime: (q) => (q.state.data?.pages?.some((p) => p.meta?.stale) ? 0 : 10 * 60_000),
  });

  const pages = query.data?.pages;

  // TMDB occasionally repeats a movie across page boundaries; duplicates would break React keys.
  const movies = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const page of pages ?? []) {
      for (const movie of page.items) {
        if (seen.has(movie.id)) continue;
        seen.add(movie.id);
        out.push(movie);
      }
    }
    return out;
  }, [pages]);

  return {
    ...query,
    movies,
    totalResults: pages?.[0]?.totalResults ?? 0,
    totalIsApproximate: Boolean(pages?.[0]?.meta?.totalIsApproximate),
    isStale: Boolean(pages?.some((p) => p.meta?.stale)),
  };
}

export function useGenres() {
  return useQuery({
    queryKey: ['genres'],
    queryFn: ({ signal }) => fetchGenres(signal),
    select: (data) => data.items,
    staleTime: 24 * 60 * 60_000,
  });
}

export function useMovie(id) {
  return useQuery({
    queryKey: ['movie', id],
    queryFn: ({ signal }) => fetchMovie(id, signal),
    staleTime: (q) => (q.state.data?.meta?.stale ? 0 : 10 * 60_000),
    enabled: Number.isInteger(id) && id > 0,
  });
}

export const isNotFound = (error) => error instanceof ApiError && error.status === 404;
