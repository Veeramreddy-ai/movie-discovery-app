import { useState } from 'react';
import { FilmIcon } from '../ui/Icons.jsx';

/**
 * Every poster lives in a fixed 2:3 box (CSS aspect-ratio), so posters of any real size, slow images and
 * missing images all occupy the same space and the grid never jumps while images load.
 */
export function Poster({ poster, title, sizes, alt, priority = false }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!poster || failed) {
    return (
      <div className="poster poster--empty" role="img" aria-label={alt ?? `No poster available for ${title}`}>
        <FilmIcon width={28} height={28} />
        <span>{title}</span>
      </div>
    );
  }

  return (
    <div className={`poster skeleton${loaded ? ' is-loaded' : ''}`}>
      <img
        src={poster.w342}
        srcSet={`${poster.w185} 185w, ${poster.w342} 342w, ${poster.w500} 500w`}
        sizes={sizes}
        alt={alt ?? `${title} poster`}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
