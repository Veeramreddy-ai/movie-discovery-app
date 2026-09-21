import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { MovieCard } from '../components/movies/MovieCard.jsx';
import { Poster } from '../components/movies/Poster.jsx';
import { RatingBadge } from '../components/movies/RatingBadge.jsx';
import { WishlistButton } from '../components/movies/WishlistButton.jsx';
import { ArrowLeftIcon, PlayIcon } from '../components/ui/Icons.jsx';
import { EmptyState, ErrorState, Notice } from '../components/ui/States.jsx';
import { isNotFound, useMovie } from '../hooks/useMovies.js';
import { useScrollRestoration } from '../hooks/useScrollRestoration.js';
import { formatCount, formatDate, formatRuntime } from '../utils/format.js';

function BackButton() {
  const navigate = useNavigate();
  const { key } = useLocation();
  // key === 'default' means this page was opened directly (no in-app history to go back to).
  const goBack = () => (key !== 'default' ? navigate(-1) : navigate('/'));
  return (
    <button type="button" className="btn btn--ghost" onClick={goBack}>
      <ArrowLeftIcon />
      Back
    </button>
  );
}

function DetailsSkeleton() {
  return (
    <div className="page" aria-busy="true" aria-label="Loading movie">
      <div className="details-skeleton">
        <div className="poster poster--large skeleton" />
        <div className="details-skeleton__text">
          <div className="skeleton skeleton--line skeleton--title" />
          <div className="skeleton skeleton--line skeleton--short" />
          <div className="skeleton skeleton--line" />
          <div className="skeleton skeleton--line" />
          <div className="skeleton skeleton--line skeleton--short" />
        </div>
      </div>
    </div>
  );
}

export default function MovieDetailsPage() {
  const params = useParams();
  const movieId = /^\d+$/.test(params.id ?? '') ? Number(params.id) : NaN;
  const { data: movie, isPending, isError, error, refetch, isFetching } = useMovie(movieId);
  useScrollRestoration(Boolean(movie));

  if (Number.isNaN(movieId)) {
    return <NotFound />;
  }
  if (isPending) return <DetailsSkeleton />;

  if (isError) {
    if (isNotFound(error)) return <NotFound />;
    return (
      <div className="page">
        <BackButton />
        <ErrorState
          title="Couldn't load this movie"
          message={error.message}
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      </div>
    );
  }

  const facts = [
    movie.year && String(movie.year),
    formatRuntime(movie.runtimeMinutes),
  ].filter(Boolean);

  return (
    <article className="details">
      <div className="hero">
        {movie.backdrop && (
          <img
            className="hero__backdrop"
            src={movie.backdrop.w1280}
            srcSet={`${movie.backdrop.w780} 780w, ${movie.backdrop.w1280} 1280w`}
            sizes="100vw"
            alt=""
            decoding="async"
          />
        )}
        <div className="hero__shade" />
        <div className="page hero__inner">
          <BackButton />
        </div>
      </div>

      <div className="page details__main">
        {movie.meta?.stale && <Notice>Showing saved details because the movie service isn't responding.</Notice>}

        <div className="details__top">
          <div className="details__poster">
            <Poster
              poster={movie.poster}
              title={movie.title}
              sizes="(max-width: 700px) 60vw, 300px"
              priority
            />
          </div>

          <div className="details__summary">
            <h1 className="details__title">{movie.title}</h1>
            {movie.tagline && <p className="details__tagline">{movie.tagline}</p>}

            <ul className="facts">
              {facts.map((f) => (
                <li key={f}>{f}</li>
              ))}
              <li>
                {movie.rating ? (
                  <>
                    <RatingBadge rating={movie.rating} />
                    <span className="facts__votes">{formatCount(movie.voteCount)} votes</span>
                  </>
                ) : (
                  <span className="facts__votes">Not rated yet</span>
                )}
              </li>
            </ul>

            {movie.genres.length > 0 && (
              <ul className="tags" aria-label="Genres">
                {movie.genres.map((g) => (
                  <li key={g.id}>
                    <Link className="chip" to={`/?genres=${g.id}`}>
                      {g.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="actions">
              <WishlistButton movie={movie} variant="full" />
              {movie.trailer && (
                <a className="btn btn--secondary" href={movie.trailer.url} target="_blank" rel="noopener noreferrer">
                  <PlayIcon />
                  Watch trailer
                </a>
              )}
            </div>

            <section className="details__section">
              <h2>Overview</h2>
              <p className="details__overview">{movie.overview ?? 'No overview is available for this movie yet.'}</p>
            </section>

            <dl className="meta-list">
              {movie.directors.length > 0 && (
                <div>
                  <dt>{movie.directors.length > 1 ? 'Directors' : 'Director'}</dt>
                  <dd>{movie.directors.join(', ')}</dd>
                </div>
              )}
              {formatDate(movie.releaseDate) && (
                <div>
                  <dt>Release date</dt>
                  <dd>{formatDate(movie.releaseDate)}</dd>
                </div>
              )}
              {movie.status && (
                <div>
                  <dt>Status</dt>
                  <dd>{movie.status}</dd>
                </div>
              )}
              {movie.originalLanguage && (
                <div>
                  <dt>Original language</dt>
                  <dd>{languageName(movie.originalLanguage)}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {movie.cast.length > 0 && (
          <section className="details__section" aria-labelledby="cast-heading">
            <h2 id="cast-heading">Cast</h2>
            <ul className="rail rail--cast">
              {movie.cast.map((person) => (
                <li key={person.id} className="person">
                  {person.profile ? (
                    <img src={person.profile} alt="" loading="lazy" decoding="async" width="92" height="138" />
                  ) : (
                    <div className="person__placeholder" aria-hidden="true" />
                  )}
                  <p className="person__name">{person.name}</p>
                  {person.character && <p className="person__role">{person.character}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {movie.recommendations.length > 0 && (
          <section className="details__section" aria-labelledby="similar-heading">
            <h2 id="similar-heading">If you like this</h2>
            <ul className="rail rail--movies">
              {movie.recommendations.map((rec) => (
                <li key={rec.id}>
                  <MovieCard movie={rec} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  );
}

function languageName(code) {
  try {
    return new Intl.DisplayNames(undefined, { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}

function NotFound() {
  return (
    <div className="page">
      <EmptyState
        title="We couldn't find that movie"
        message="It may have been removed, or the link is incorrect."
        action={
          <Link className="btn btn--secondary" to="/">
            Browse movies
          </Link>
        }
      />
    </div>
  );
}
