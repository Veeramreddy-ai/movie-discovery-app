import { useEffect, useLayoutEffect } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router-dom';
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js';
import { Notice } from '../ui/States.jsx';
import { Header } from './Header.jsx';

export function Layout() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const online = useOnlineStatus();

  // We restore scroll positions ourselves (see useScrollRestoration); the browser's automatic
  // restoration fires before async content exists and lands in the wrong place.
  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
  }, []);

  // New page (link click) starts at the top. Back/forward (POP) is handled by each page's restoration hook.
  useLayoutEffect(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0);
  }, [pathname, navigationType]);

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Header />
      {!online && (
        <div className="page page--tight">
          <Notice>You're offline. Saved results stay available, but new searches won't load until you reconnect.</Notice>
        </div>
      )}
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="footer">
        <p>Movie data from TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
      </footer>
    </>
  );
}
