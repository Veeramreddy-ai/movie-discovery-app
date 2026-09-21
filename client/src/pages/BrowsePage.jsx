import { useCallback, useEffect, useRef } from 'react';
import { GenreChips } from '../components/filters/GenreChips.jsx';
import { SearchBar } from '../components/filters/SearchBar.jsx';
import { Toolbar } from '../components/filters/Toolbar.jsx';
import { MovieGrid } from '../components/movies/MovieGrid.jsx';
import { SkeletonGrid } from '../components/ui/Skeletons.jsx';
import { EmptyState, ErrorState, Notice } from '../components/ui/States.jsx';
import { useBrowseFilters } from '../hooks/useBrowseFilters.js';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll.js';
import { useGenres, useMovies } from '../hooks/useMovies.js';
import { useScrollRestoration } from '../hooks/useScrollRestoration.js';
import { saveBrowseSearch } from '../utils/browseMemory.js';
import { formatCount } from '../utils/format.js';

// TMDB only lets you page through the first 500 pages (20 per page).
const REACHABLE_RESULTS = 10_000;

export default function BrowsePage() {
  const { filters, update, clearAll, hasCriteria, searchString } = useBrowseFilters();
  const genres = useGenres();
  const list = useMovies(filters);
  const {
    movies, isPending, isError, error, refetch, data,
    hasNextPage, fetchNextPage, isFetching, isFetchingNextPage, isFetchNextPageError,
    isPlaceholderData, isRefetchError, totalResults, totalIsApproximate, isStale,
  } = list;

  const onSearch = useCallback((query) => update({ query }), [update]);

  useEffect(() => saveBrowseSearch(searchString), [searchString]);
  useScrollRestoration(!isPending);

  // Changing search/filters shows a different list, so start at its top.
  const previousSearch = useRef(searchString);
  useEffect(() => {
    if (previousSearch.current !== searchString) {
      previousSearch.current = searchString;
      window.scrollTo(0, 0);
    }
  }, [searchString]);

  const sentinelRef = useInfiniteScroll({
    enabled: Boolean(hasNextPage) && !isFetching && !isPlaceholderData && !isFetchNextPageError,
    onLoadMore: fetchNextPage,
  });

  const hasData = Boolean(data);
  const isEmpty = hasData && movies.length === 0 && !hasNextPage && !isFetching;
  const selectedNames = (genres.data ?? []).filter((g) => filters.genres.includes(g.id)).map((g) => g.name);
  const heading = filters.query
    ? `Results for \u201C${filters.query}\u201D`
    : selectedNames.length
      ? selectedNames.join(' + ')
      : 'All movies';

  return (
    <div className="page">
      <section className="intro">
        <h1 className="intro__title">Find your next watch</h1>
        <p className="intro__text">Search a title, or browse by genre, year and rating.</p>
        <SearchBar query={filters.query} onSearch={onSearch} />
      </section>

      <GenreChips
        genres={genres.data ?? []}
        selected={filters.genres}
        onChange={(ids) => update({ genres: ids })}
        isLoading={genres.isPending}
        isError={genres.isError}
        onRetry={genres.refetch}
      />

      <Toolbar filters={filters} onChange={update} onClear={clearAll} canClear={hasCriteria} />

      <section aria-labelledby="results-heading" className="results">
        <div className="results__head">
          <h2 id="results-heading" className="results__title">
            {heading}
          </h2>
          {hasData && !totalIsApproximate && totalResults > 0 && (
            <p className="results__count" aria-live="polite">
              {formatCount(totalResults)} {totalResults === 1 ? 'movie' : 'movies'}
            </p>
          )}
        </div>

        {isStale && (
          <Notice>
            The movie service isn't responding, so you're seeing recently saved results.{' '}
            <button type="button" className="link-btn" onClick={() => refetch()}>
              Try again
            </button>
          </Notice>
        )}
        {isRefetchError && !isFetchNextPageError && hasData && (
          <Notice>Couldn't refresh these results. Showing what we loaded earlier.</Notice>
        )}

        {isPending && <SkeletonGrid />}

        {isError && !hasData && (
          <ErrorState
            title="Couldn't load movies"
            message={error.message}
            onRetry={() => refetch()}
            retrying={isFetching}
          />
        )}

        {isEmpty && (
          <EmptyState
            title="No movies match"
            message={
              filters.query
                ? `Nothing found for \u201C${filters.query}\u201D with these filters. Check the spelling or loosen the filters.`
                : 'Try removing a genre or widening the year and rating.'
            }
            action={
              hasCriteria && (
                <button type="button" className="btn btn--secondary" onClick={clearAll}>
                  Clear search and filters
                </button>
              )
            }
          />
        )}

        {hasData && movies.length > 0 && <MovieGrid movies={movies} busy={isPlaceholderData} />}

        {hasData && (
          <div className="more">
            {isFetchNextPageError ? (
              <ErrorState
                compact
                title="Couldn't load more movies"
                message={error?.message}
                onRetry={() => fetchNextPage()}
                retrying={isFetchingNextPage}
              />
            ) : hasNextPage ? (
              <>
                <div ref={sentinelRef} className="more__sentinel" aria-hidden="true" />
                {isFetchingNextPage || (movies.length === 0 && isFetching) ? (
                  <p className="more__status" role="status">
                    Loading more movies...
                  </p>
                ) : (
                  <button type="button" className="btn btn--secondary" onClick={() => fetchNextPage()}>
                    Load more
                  </button>
                )}
              </>
            ) : (
              movies.length > 0 && (
                <p className="more__status">
                  You've reached the end of the results.
                  {totalResults > REACHABLE_RESULTS &&
                    ' The movie service only lets us page through the first 10,000 matches, so add a genre or year to narrow things down.'}
                </p>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}
