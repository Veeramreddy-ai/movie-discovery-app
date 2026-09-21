/**
 * Ordered, append-only list of schema migrations. The applied version is tracked with SQLite's built-in
 * `PRAGMA user_version`, so there is no extra bookkeeping table. To change the schema, add a NEW entry -
 * never edit an existing one.
 */
export const migrations = [
  // v1: wishlist
  `
  CREATE TABLE wishlist (
    client_id    TEXT    NOT NULL,
    movie_id     INTEGER NOT NULL,
    title        TEXT    NOT NULL,
    poster_path  TEXT,
    release_year INTEGER,
    vote_average REAL,
    added_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    PRIMARY KEY (client_id, movie_id)
  ) WITHOUT ROWID;

  CREATE INDEX idx_wishlist_client_added ON wishlist (client_id, added_at DESC);
  `,
];

export function migrate(db) {
  const current = db.prepare('PRAGMA user_version').get().user_version;
  for (let version = current; version < migrations.length; version += 1) {
    db.exec('BEGIN');
    try {
      db.exec(migrations[version]);
      db.exec(`PRAGMA user_version = ${version + 1}`);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}
