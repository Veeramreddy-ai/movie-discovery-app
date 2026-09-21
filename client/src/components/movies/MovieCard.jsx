import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Poster } from './Poster.jsx';
import { RatingBadge } from './RatingBadge.jsx';
import { WishlistButton } from './WishlistButton.jsx';

// Tells the browser how wide the poster will render so it downloads the smallest sufficient image.
const POSTER_SIZES = '(max-width: 480px) 45vw, (max-width: 900px) 30vw, 220px';

export const MovieCard = memo(function MovieCard({ movie, priority = false, extra }) {
  return (
    <article className="card">
      <Link to={`/movie/${movie.id}`} className="card__link">
        <Poster poster={movie.poster} title={movie.title} sizes={POSTER_SIZES} priority={priority} alt="" />
        <div className="card__body">
          <h3 className="card__title" title={movie.title}>
            {movie.title}
          </h3>
          <div className="card__meta">
            {movie.year && <span className="card__year">{movie.year}</span>}
            <RatingBadge rating={movie.rating} />
          </div>
        </div>
      </Link>
      <WishlistButton movie={movie} />
      {extra}
    </article>
  );
});
