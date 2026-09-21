import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export const DEFAULT_SORT = 'popularity.desc';
export const MAX_GENRES = 5;

export const SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Most popular' },
  { value: 'vote_average.desc', label: 'Top rated' },
  { value: 'primary_release_date.desc', label: 'Newest first' },
  { value: 'primary_release_date.asc', label: 'Oldest first' },
  { value: 'original_title.asc', label: 'Title A to Z' },
  { value: 'revenue.desc', label: 'Highest grossing' },
];
const VALID_SORTS = new Set(SORT_OPTIONS.map((o) => o.value));

function parseGenres(raw) {
  if (!raw) return [];
  const ids = raw.split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0);
  return [...new Set(ids)].slice(0, MAX_GENRES);
}

function parseIntInRange(raw, min, max) {
  if (raw == null || raw === '') return undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n >= min && n <= max ? n : undefined;
}

/**
 * The URL is the single source of truth for what the user is looking at:
 *   /?q=matrix&genres=28,878&sort=vote_average.desc&year=1999&minRating=7
 *
 * That gives us, for free: shareable links, working back/forward buttons, and a browse state that
 * survives visiting a movie and coming back - no separate state store to keep in sync.
 */
export function useBrowseFilters() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo(
    () => ({
      query: (params.get('q') ?? '').trim(),
      genres: parseGenres(params.get('genres')),
      sort: VALID_SORTS.has(params.get('sort')) ? params.get('sort') : DEFAULT_SORT,
      year: parseIntInRange(params.get('year'), 1870, new Date().getFullYear() + 5),
      minRating: parseIntInRange(params.get('minRating'), 1, 9),
    }),
    [params],
  );

  const update = useCallback(
    (patch) => {
      // replace: true so typing / clicking chips doesn't fill the history stack; Back leaves the page.
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const put = (key, value, isDefault = false) => {
            if (value === undefined || value === null || value === '' || isDefault) next.delete(key);
            else next.set(key, String(value));
          };
          if ('query' in patch) put('q', patch.query.trim());
          if ('genres' in patch) put('genres', patch.genres.join(','));
          if ('sort' in patch) put('sort', patch.sort, patch.sort === DEFAULT_SORT);
          if ('year' in patch) put('year', patch.year);
          if ('minRating' in patch) put('minRating', patch.minRating);
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const clearAll = useCallback(() => setParams({}, { replace: true }), [setParams]);

  const activeFilterCount = filters.genres.length + (filters.year ? 1 : 0) + (filters.minRating ? 1 : 0);
  const hasCriteria = activeFilterCount > 0 || filters.query.length > 0 || filters.sort !== DEFAULT_SORT;

  return { filters, update, clearAll, activeFilterCount, hasCriteria, searchString: params.toString() };
}
