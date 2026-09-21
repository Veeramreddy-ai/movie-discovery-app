import { Router } from 'express';
import { requireClientId } from '../middleware/clientId.js';
import { parseMovieId, parseWishlistBody } from './schemas.js';

export function createWishlistRouter({ movieService, wishlistRepository }) {
  const router = Router();
  router.use(requireClientId);
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store'); // user-specific, must never be served from a shared cache
    next();
  });

  // GET /api/wishlist
  router.get('/', (req, res) => {
    const items = wishlistRepository.list(req.clientId);
    res.json({ items, total: items.length });
  });

  // POST /api/wishlist  { movieId }
  // The client only says WHICH movie; the server looks up the title/poster itself, so clients
  // cannot store arbitrary data and the snapshot always matches TMDB.
  router.post('/', async (req, res) => {
    const { movieId } = parseWishlistBody(req.body);
    const record = await movieService.getWishlistRecord(movieId);
    const item = wishlistRepository.add(req.clientId, record);
    res.status(201).json({ item });
  });

  // DELETE /api/wishlist/:movieId
  router.delete('/:movieId', (req, res) => {
    wishlistRepository.remove(req.clientId, parseMovieId(req.params.movieId));
    res.status(204).end();
  });

  return router;
}
