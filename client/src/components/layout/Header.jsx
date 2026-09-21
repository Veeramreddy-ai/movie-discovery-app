import { Link, NavLink } from 'react-router-dom';
import { useWishlist } from '../../hooks/useWishlist.js';
import { readBrowseSearch } from '../../utils/browseMemory.js';

export function Header() {
  const { data } = useWishlist();
  const count = data?.total ?? 0;
  const lastBrowse = readBrowseSearch();

  return (
    <header className="header">
      <div className="header__inner">
        <Link to="/" className="brand" aria-label="Marquee home">
          Marquee
        </Link>
        <nav className="nav" aria-label="Main">
          {/* Restores the last search/filters instead of resetting the user's browsing context. */}
          <NavLink to={{ pathname: '/', search: lastBrowse ? `?${lastBrowse}` : '' }} end className="nav__link">
            Discover
          </NavLink>
          <NavLink to="/wishlist" className="nav__link">
            Wishlist
            {count > 0 && (
              <span className="badge" aria-label={`${count} saved`}>
                {count}
              </span>
            )}
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
