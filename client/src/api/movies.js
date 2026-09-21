import { request } from './http.js';

export const fetchGenres = (signal) => request('/genres', { signal });

export const fetchMovies = ({ query, genres, sort, year, minRating, page }, signal) =>
  request('/movies', {
    params: { query, genres, sort, year, minRating, page },
    signal,
  });

export const fetchMovie = (id, signal) => request(`/movies/${id}`, { signal });
