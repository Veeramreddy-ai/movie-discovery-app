import { ConflictError } from '../lib/errors.js';

export const MAX_WISHLIST_ITEMS = 1000;


export function createWishlistRepository(db, { fromRow }) {
  const listStmt = db.prepare(
    `SELECT movie_id, title, poster_path, release_year, vote_average, added_at
       FROM wishlist WHERE client_id = ? ORDER BY added_at DESC, movie_id DESC LIMIT ?`,
  );
  const getStmt = db.prepare(
    `SELECT movie_id, title, poster_path, release_year, vote_average, added_at
       FROM wishlist WHERE client_id = ? AND movie_id = ?`,
  );
  const countStmt = db.prepare('SELECT COUNT(*) AS n FROM wishlist WHERE client_id = ?');
  // Re-adding keeps the original added_at but refreshes the snapshot.
  const upsertStmt = db.prepare(
    `INSERT INTO wishlist (client_id, movie_id, title, poster_path, release_year, vote_average)
     VALUES (@clientId, @movieId, @title, @posterPath, @year, @rating)
     ON CONFLICT (client_id, movie_id) DO UPDATE SET
       title = excluded.title,
       poster_path = excluded.poster_path,
       release_year = excluded.release_year,
       vote_average = excluded.vote_average`,
  );
  const deleteStmt = db.prepare('DELETE FROM wishlist WHERE client_id = ? AND movie_id = ?');

  return {
    list(clientId) {
      return listStmt.all(clientId, MAX_WISHLIST_ITEMS).map(fromRow);
    },

    add(clientId, record) {
      const exists = getStmt.get(clientId, record.movieId);
      if (!exists && countStmt.get(clientId).n >= MAX_WISHLIST_ITEMS) {
        throw new ConflictError('WISHLIST_FULL', `Your wishlist is full (${MAX_WISHLIST_ITEMS} movies max).`);
      }
      upsertStmt.run({ clientId, ...record });
      return fromRow(getStmt.get(clientId, record.movieId));
    },

    /** Idempotent: removing something that isn't there is not an error. */
    remove(clientId, movieId) {
      return deleteStmt.run(clientId, movieId).changes > 0;
    },
  };
}
