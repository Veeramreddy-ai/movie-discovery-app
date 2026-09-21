import { Router } from 'express';
import { parseListQuery, parseMovieId } from './schemas.js';

export function createMoviesRouter({ movieService }) {
  const router = Router();

  // GET /api/genres
  router.get('/genres', async (_req, res) => {
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(await movieService.getGenres());
  });

  // GET /api/movies?query=&genres=28,12&sort=popularity.desc&year=&minRating=&page=1
  router.get('/movies', async (req, res) => {
    const params = parseListQuery(req.query);
    res.set('Cache-Control', 'private, max-age=60');
    res.json(await movieService.listMovies(params));
  });

  // GET /api/movies/:id
  router.get('/movies/:id', async (req, res) => {
    const id = parseMovieId(req.params.id);
    res.set('Cache-Control', 'private, max-age=300');
    res.json(await movieService.getMovie(id));
  });

  return router;
}
