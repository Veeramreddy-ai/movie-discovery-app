
export function createNormalizers({ imageBaseUrl }) {
  const image = (size, path) => (isImagePath(path) ? `${imageBaseUrl}/${size}${path}` : null);

  const poster = (path) =>
    isImagePath(path) ? { w185: image('w185', path), w342: image('w342', path), w500: image('w500', path) } : null;

  const backdrop = (path) =>
    isImagePath(path) ? { w780: image('w780', path), w1280: image('w1280', path) } : null;

  function toSummary(raw) {
    if (!raw || !Number.isInteger(raw.id)) return null; // unusable without an id
    return {
      id: raw.id,
      title: firstText(raw.title, raw.original_title) ?? 'Untitled',
      year: yearOf(raw.release_date),
      rating: ratingOf(raw),
      poster: poster(raw.poster_path),
    };
  }

  function toSummaries(list) {
    if (!Array.isArray(list)) return [];
    return list.map(toSummary).filter(Boolean);
  }

  function toDetail(raw) {
    const summary = toSummary(raw);
    if (!summary) return null;

    const cast = (Array.isArray(raw.credits?.cast) ? raw.credits.cast : [])
      .filter((c) => c && Number.isInteger(c.id) && firstText(c.name))
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
      .slice(0, 12)
      .map((c) => ({
        id: c.id,
        name: c.name.trim(),
        character: firstText(c.character) ?? null,
        profile: image('w185', c.profile_path),
      }));

    const directors = [
      ...new Set(
        (Array.isArray(raw.credits?.crew) ? raw.credits.crew : [])
          .filter((c) => c?.job === 'Director' && firstText(c.name))
          .map((c) => c.name.trim()),
      ),
    ];

    return {
      ...summary,
      tagline: firstText(raw.tagline) ?? null,
      overview: firstText(raw.overview) ?? null,
      releaseDate: firstText(raw.release_date) ?? null,
      runtimeMinutes: Number.isFinite(raw.runtime) && raw.runtime > 0 ? Math.round(raw.runtime) : null,
      status: firstText(raw.status) ?? null,
      originalLanguage: firstText(raw.original_language) ?? null,
      voteCount: Number.isFinite(raw.vote_count) ? raw.vote_count : 0,
      homepage: firstText(raw.homepage) ?? null,
      genres: toGenres(raw.genres),
      backdrop: backdrop(raw.backdrop_path),
      directors,
      cast,
      trailer: pickTrailer(raw.videos?.results),
      recommendations: toSummaries(raw.recommendations?.results).slice(0, 12),
    };
  }

  function toGenres(list) {
    if (!Array.isArray(list)) return [];
    return list
      .filter((g) => g && Number.isInteger(g.id) && firstText(g.name))
      .map((g) => ({ id: g.id, name: g.name.trim() }));
  }

  /** What we persist for a wishlist entry (a snapshot, so the wishlist renders without calling TMDB). */
  function toWishlistRecord(raw) {
    const summary = toSummary(raw);
    if (!summary) return null;
    return {
      movieId: summary.id,
      title: summary.title,
      year: summary.year,
      rating: summary.rating,
      posterPath: isImagePath(raw.poster_path) ? raw.poster_path : null,
    };
  }

  function fromWishlistRow(row) {
    return {
      id: row.movie_id,
      title: row.title,
      year: row.release_year ?? null,
      rating: row.vote_average ?? null,
      poster: poster(row.poster_path),
      addedAt: row.added_at,
    };
  }

  return { toSummary, toSummaries, toDetail, toGenres, toWishlistRecord, fromWishlistRow };
}

const isImagePath = (p) => typeof p === 'string' && p.startsWith('/');

function firstText(...values) {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

function yearOf(releaseDate) {
  const match = typeof releaseDate === 'string' ? /^(\d{4})/.exec(releaseDate) : null;
  return match ? Number(match[1]) : null;
}

/** A 0.0 average with 0 votes means "not rated yet", not "terrible". */
function ratingOf(raw) {
  if (!Number.isFinite(raw.vote_average) || !(raw.vote_count > 0)) return null;
  return Math.round(raw.vote_average * 10) / 10;
}

function pickTrailer(results) {
  const youtube = (Array.isArray(results) ? results : []).filter((v) => v?.site === 'YouTube' && v.key);
  const pick =
    youtube.find((v) => v.type === 'Trailer' && v.official) ??
    youtube.find((v) => v.type === 'Trailer') ??
    youtube.find((v) => v.type === 'Teaser');
  if (!pick) return null;
  return {
    key: pick.key,
    name: firstText(pick.name) ?? 'Trailer',
    url: `https://www.youtube.com/watch?v=${encodeURIComponent(pick.key)}`,
  };
}
