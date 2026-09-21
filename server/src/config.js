import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(here, '..');

// Load server/.env regardless of the directory the process was started from.
dotenv.config({ path: path.join(serverRoot, '.env'), quiet: true });

const int = (value, fallback) => {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};
const seconds = (value, fallbackSeconds) => int(value, fallbackSeconds) * 1000;

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: int(process.env.PORT, 4000),
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  dbPath: process.env.DB_PATH
    ? path.resolve(process.cwd(), process.env.DB_PATH)
    : path.join(serverRoot, 'data', 'movies.db'),
  clientDistDir: path.resolve(serverRoot, '../client/dist'),

  tmdb: {
    apiKey: process.env.TMDB_API_KEY ?? '',
    baseUrl: (process.env.TMDB_BASE_URL ?? 'https://api.themoviedb.org/3').replace(/\/+$/, ''),
    imageBaseUrl: (process.env.TMDB_IMAGE_BASE_URL ?? 'https://image.tmdb.org/t/p').replace(/\/+$/, ''),
    language: process.env.TMDB_LANGUAGE ?? 'en-US',
    timeoutMs: int(process.env.TMDB_TIMEOUT_MS, 8000),
    maxRetries: int(process.env.TMDB_MAX_RETRIES, 2),
    maxConcurrent: Math.max(1, int(process.env.TMDB_MAX_CONCURRENT, 8)),
  },

  cache: {
    listTtlMs: seconds(process.env.LIST_CACHE_TTL_SECONDS, 5 * 60),
    detailTtlMs: seconds(process.env.DETAIL_CACHE_TTL_SECONDS, 30 * 60),
    genreTtlMs: seconds(process.env.GENRE_CACHE_TTL_SECONDS, 24 * 60 * 60),
    // How long an expired entry may still be served if TMDB is failing.
    staleTtlMs: seconds(process.env.STALE_CACHE_TTL_SECONDS, 24 * 60 * 60),
    maxEntries: int(process.env.CACHE_MAX_ENTRIES, 1000),
  },
};

export function assertRuntimeConfig(cfg = config) {
  if (!cfg.tmdb.apiKey) {
    throw new Error(
      'TMDB_API_KEY is missing. Create server/.env (see server/.env.example) and add a free key from https://www.themoviedb.org/settings/api',
    );
  }
}
