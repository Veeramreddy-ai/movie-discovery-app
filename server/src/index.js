import { createApp } from './app.js';
import { assertRuntimeConfig, config } from './config.js';
import { openDatabase } from './db/index.js';
import { createWishlistRepository } from './db/wishlistRepository.js';
import { TTLCache } from './lib/cache.js';
import { createMovieService } from './services/movieService.js';
import { createNormalizers } from './services/normalizers.js';
import { createTmdbClient } from './services/tmdbClient.js';

try {
  assertRuntimeConfig();
} catch (err) {
  console.error(`\n${err.message}\n`);
  process.exit(1);
}

// --- composition root: the only place where concrete dependencies are wired together ---
const db = openDatabase(config.dbPath);
const normalizers = createNormalizers({ imageBaseUrl: config.tmdb.imageBaseUrl });
const tmdb = createTmdbClient(config.tmdb);
const cache = new TTLCache({ maxEntries: config.cache.maxEntries });
const movieService = createMovieService({
  tmdb,
  cache,
  normalizers,
  cacheConfig: config.cache,
  language: config.tmdb.language,
});
const wishlistRepository = createWishlistRepository(db, { fromRow: normalizers.fromWishlistRow });

const app = createApp({
  movieService,
  wishlistRepository,
  corsOrigins: config.corsOrigins,
  clientDistDir: config.clientDistDir,
  logRequests: config.env !== 'test',
});

const server = app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});

function shutdown(signal) {
  console.log(`\n${signal} received, shutting down...`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
