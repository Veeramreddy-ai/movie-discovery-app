import { MAX_GENRES } from '../../hooks/useBrowseFilters.js';

export function GenreChips({ genres, selected, onChange, isLoading, isError, onRetry }) {
  if (isLoading) {
    return (
      <div className="chips" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} className="chip chip--skeleton skeleton" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="chips-error">
        Genres couldn't be loaded.{' '}
        <button type="button" className="link-btn" onClick={onRetry}>
          Try again
        </button>
      </p>
    );
  }

  const atLimit = selected.length >= MAX_GENRES;
  const toggle = (id) =>
    onChange(selected.includes(id) ? selected.filter((g) => g !== id) : [...selected, id]);

  return (
    <div className="chips" role="group" aria-label="Filter by genre">
      <button type="button" className="chip" aria-pressed={selected.length === 0} onClick={() => onChange([])}>
        All genres
      </button>
      {genres.map((genre) => {
        const active = selected.includes(genre.id);
        const blocked = atLimit && !active;
        return (
          <button
            key={genre.id}
            type="button"
            className="chip"
            aria-pressed={active}
            disabled={blocked}
            title={blocked ? `You can combine up to ${MAX_GENRES} genres` : undefined}
            onClick={() => toggle(genre.id)}
          >
            {genre.name}
          </button>
        );
      })}
    </div>
  );
}
