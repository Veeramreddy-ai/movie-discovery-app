import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout.jsx';
import { ErrorBoundary } from './components/ui/ErrorBoundary.jsx';
import BrowsePage from './pages/BrowsePage.jsx';

// The browse page is the landing page so it ships in the main bundle; the others load on demand.
const MovieDetailsPage = lazy(() => import('./pages/MovieDetailsPage.jsx'));
const WishlistPage = lazy(() => import('./pages/WishlistPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="page" aria-busy="true" />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<BrowsePage />} />
            <Route path="movie/:id" element={<MovieDetailsPage />} />
            <Route path="wishlist" element={<WishlistPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
