import { MovieCard } from './MovieCard.jsx';

export function MovieGrid({ movies, busy = false }) {
  return (
    <ul className={`grid${busy ? ' is-busy' : ''}`} aria-busy={busy}>
      {movies.map((movie, index) => (
        <li key={movie.id}>
          <MovieCard movie={movie} priority={index < 4} />
        </li>
      ))}
    </ul>
  );
}
