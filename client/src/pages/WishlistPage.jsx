import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MovieGrid } from '../components/movies/MovieGrid.jsx';
import { SelectField } from '../components/ui/SelectField.jsx';
import { SkeletonGrid } from '../components/ui/Skeletons.jsx';
import { EmptyState, ErrorState } from '../components/ui/States.jsx';
import { useScrollRestoration } from '../hooks/useScrollRestoration.js';
import { useWishlist } from '../hooks/useWishlist.js';

const SORTERS = {
  added: { label: 'Recently added', compare: (a, b) => b.addedAt.localeCompare(a.addedAt) },
  title: { label: 'Title A to Z', compare: (a, b) => a.title.localeCompare(b.title) },
  rating: { label: 'Highest rated', compare: (a, b) => (b.rating ?? -1) - (a.rating ?? -1) },
  year: { label: 'Newest release', compare: (a, b) => (b.year ?? 0) - (a.year ?? 0) },
};

export default function WishlistPage() {
  const { data, isPending, isError, error, refetch, isFetching } = useWishlist();
  const [sortKey, setSortKey] = useState('added');
  useScrollRestoration(Boolean(data));

  const items = useMemo(() => [...(data?.items ?? [])].sort(SORTERS[sortKey].compare), [data, sortKey]);

  return (
    <div className="page">
      <div className="results__head">
        <h1 className="page-title">Your wishlist</h1>
        {data && data.total > 0 && (
          <p className="results__count">
            {data.total} {data.total === 1 ? 'movie' : 'movies'}
          </p>
        )}
      </div>

      {isPending && <SkeletonGrid count={8} />}

      {isError && !data && (
        <ErrorState
          title="Couldn't load your wishlist"
          message={error.message}
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      )}

      {data && items.length === 0 && (
        <EmptyState
          title="Your wishlist is empty"
          message="Tap the heart on any movie to save it here. Your list is kept on this device between visits."
          action={
            <Link className="btn btn--primary" to="/">
              Browse movies
            </Link>
          }
        />
      )}

      {items.length > 0 && (
        <>
          <div className="toolbar">
            <SelectField label="Sort by" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
              {Object.entries(SORTERS).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </SelectField>
          </div>
          <MovieGrid movies={items} />
        </>
      )}
    </div>
  );
}
