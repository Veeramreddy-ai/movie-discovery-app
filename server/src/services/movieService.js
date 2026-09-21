import { NotFoundError, UpstreamError } from '../lib/errors.js';

export const SORT_OPTIONS = [
  'popularity.desc',
  'vote_average.desc',
  'primary_release_date.desc',
  'primary_release_date.asc',
  'original_title.asc',
  'revenue.desc',
];
export const DEFAULT_SORT = 'popularity.desc';

// TMDB rejects page numbers above 500.
export const MAX_PAGE = 500;

// Sorting by rating (or title / oldest) without a vote floor surfaces obscure titles with a single vote.
const MIN_VOTES_BY_SORT = {
  'vote_average.desc': 300,
  'primary_release_date.asc': 50,
  'original_title.asc': 50,
};

const isUpstreamError = (err) => err instanceof UpstreamError;
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Business logic between the HTTP routes and TMDB.
 *
 * Design note: the cache stores the RAW upstream payload and we normalise on every read. Normalising is
 * cheap, and it means changing a normaliser never requires flushing the cache. Cache keys are built from
 * already-validated, canonical parameters so equivalent requests share one entry.
 */
export function createMovieService({
  tmdb,
  cache,
  normalizers,
  cacheConfig,
  language = 'en-US',
  today = () => new Date().toISOString().slice(0, 10),
}) {
  function load(key, ttlMs, path, params = {}) {
    return cache.getOrLoad(
      key,
      async () => {
        const data = await tmdb.get(path, { language, ...params });
        if (!isObject(data)) {
          throw new UpstreamError(502, 'UPSTREAM_BAD_RESPONSE', 'The movie service returned an unexpected response.');
        }
        return data; // only validated payloads reach the cache
      },
      { ttlMs, staleTtlMs: cacheConfig.staleTtlMs, staleIf: isUpstreamError },
    );
  }

  /**
   * Browse (discover) or search. TMDB's search endpoint cannot sort or filter, so when a text query is present:
   *  - ordering is TMDB's relevance ranking (the `sort` param is ignored)
   *  - genre / minimum-rating filters are applied to each returned page (so a page can hold fewer than 20 items)
   */
  async function listMovies({ query, genres, sort, year, minRating, page }) {
    const isSearch = query.length > 0;
    let result;

    if (isSearch) {
      result = await load(`search|${query.toLowerCase()}|${year ?? ''}|${page}`, cacheConfig.listTtlMs, '/search/movie', {
        query,
        page,
        primary_release_year: year,
        include_adult: false,
      });
    } else {
      const voteFloor = Math.max(MIN_VOTES_BY_SORT[sort] ?? 0, minRating != null ? 50 : 0) || undefined;
      result = await load(
        `discover|${sort}|${genres.join(',')}|${year ?? ''}|${minRating ?? ''}|${page}`,
        cacheConfig.listTtlMs,
        '/discover/movie',
        {
          sort_by: sort,
          page,
          with_genres: genres.join(',') || undefined, // comma = movie must have ALL selected genres
          primary_release_year: year,
          'vote_average.gte': minRating,
          'vote_count.gte': voteFloor,
          // "Newest first" would otherwise start with unreleased, unrated titles.
          'primary_release_date.lte': sort === 'primary_release_date.desc' ? today() : undefined,
          include_adult: false,
          include_video: false,
        },
      );
    }

    const { value: raw, stale } = result;
    let results = Array.isArray(raw.results) ? raw.results : [];
    const filteredAfterFetch = isSearch && (genres.length > 0 || minRating != null);
    if (filteredAfterFetch) {
      results = results.filter(
        (r) =>
          genres.every((g) => Array.isArray(r?.genre_ids) && r.genre_ids.includes(g)) &&
          (minRating == null || (Number.isFinite(r?.vote_average) && r.vote_average >= minRating)),
      );
    }

    const totalPages = Math.min(Number.isInteger(raw.total_pages) ? raw.total_pages : 0, MAX_PAGE);
    const items = normalizers.toSummaries(results);

    return {
      items,
      page,
      totalPages,
      totalResults: Number.isInteger(raw.total_results) ? raw.total_results : items.length,
      hasMore: page < totalPages,
      meta: { stale, totalIsApproximate: filteredAfterFetch, ordering: isSearch ? 'relevance' : sort },
    };
  }

  async function fetchRawMovie(id) {
    return load(`movie|${id}`, cacheConfig.detailTtlMs, `/movie/${id}`, {
      append_to_response: 'credits,videos,recommendations',
      include_video_language: `${language.split('-')[0]},null`,
    });
  }

  async function getMovie(id) {
    const { value: raw, stale } = await fetchRawMovie(id);
    const detail = normalizers.toDetail(raw);
    if (!detail) throw new NotFoundError('Movie not found.');
    return { ...detail, meta: { stale } };
  }

  /** Used by the wishlist so the server (not the client) decides what gets stored. */
  async function getWishlistRecord(id) {
    const { value: raw } = await fetchRawMovie(id);
    const record = normalizers.toWishlistRecord(raw);
    if (!record) throw new NotFoundError('Movie not found.');
    return record;
  }

  async function getGenres() {
    const { value: raw, stale } = await load('genres', cacheConfig.genreTtlMs, '/genre/movie/list');
    return { items: normalizers.toGenres(raw.genres), meta: { stale } };
  }

  return { listMovies, getMovie, getWishlistRecord, getGenres };
}
