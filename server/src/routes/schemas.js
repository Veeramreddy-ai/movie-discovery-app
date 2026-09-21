import { z } from 'zod';
import { ValidationError } from '../lib/errors.js';
import { DEFAULT_SORT, MAX_PAGE, SORT_OPTIONS } from '../services/movieService.js';

const currentYear = new Date().getFullYear();

const listQuerySchema = z.object({
  query: z
    .string()
    .max(100, 'query is too long (max 100 characters)')
    .default('')
    .transform((s) => s.trim().replace(/\s+/g, ' ')),
  genres: z
    .string()
    .regex(/^(\d+(,\d+){0,4})?$/, 'genres must be up to 5 comma-separated ids')
    .default('')
    .transform((s) => [...new Set(s ? s.split(',').map(Number) : [])].sort((a, b) => a - b)),
  sort: z.enum(SORT_OPTIONS).default(DEFAULT_SORT),
  year: z.coerce.number().int().min(1870).max(currentYear + 5).optional(),
  minRating: z.coerce.number().min(0).max(10).optional(),
  page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1),
});

const movieIdSchema = z.coerce.number().int().positive().max(2_147_483_647);
const wishlistBodySchema = z.object({ movieId: movieIdSchema });

function parse(schema, input, label) {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  throw new ValidationError(
    `Invalid ${label}`,
    result.error.issues.map((i) => ({ field: i.path.join('.') || label, message: i.message })),
  );
}

export function parseListQuery(rawQuery) {
  // Treat "?year=" like "no year"; repeated params (?page=1&page=2) arrive as arrays and fail validation.
  const cleaned = Object.fromEntries(Object.entries(rawQuery).filter(([, v]) => v !== ''));
  return parse(listQuerySchema, cleaned, 'query parameters');
}

export const parseMovieId = (raw) => parse(movieIdSchema, raw, 'movie id');
export const parseWishlistBody = (body) => parse(wishlistBodySchema, body ?? {}, 'request body');
