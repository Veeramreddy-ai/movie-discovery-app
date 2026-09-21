import { useIsWishlisted, useToggleWishlist } from '../../hooks/useWishlist.js';
import { HeartIcon } from '../ui/Icons.jsx';

export function WishlistButton({ movie, variant = 'icon' }) {
  const saved = useIsWishlisted(movie.id);
  const { mutate } = useToggleWishlist();

  const onClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    mutate({ movie, add: !saved });
  };

  if (variant === 'full') {
    return (
      <button type="button" className={`btn ${saved ? 'btn--saved' : 'btn--primary'}`} aria-pressed={saved} onClick={onClick}>
        <HeartIcon filled={saved} />
        {saved ? 'In your wishlist' : 'Add to wishlist'}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`wish-btn${saved ? ' is-saved' : ''}`}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${movie.title} from wishlist` : `Add ${movie.title} to wishlist`}
      title={saved ? 'Remove from wishlist' : 'Add to wishlist'}
      onClick={onClick}
    >
      <HeartIcon filled={saved} />
    </button>
  );
}
