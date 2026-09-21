import { request } from './http.js';

export const fetchWishlist = (signal) => request('/wishlist', { signal, withClientId: true });

export const addToWishlist = (movieId) =>
  request('/wishlist', { method: 'POST', body: { movieId }, withClientId: true });

export const removeFromWishlist = (movieId) =>
  request(`/wishlist/${movieId}`, { method: 'DELETE', withClientId: true });
