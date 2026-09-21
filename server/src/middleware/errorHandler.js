import { AppError, NotFoundError } from '../lib/errors.js';

export function notFoundHandler(_req, _res, next) {
  next(new NotFoundError('Route not found.'));
}


export function createErrorHandler({ logger = console } = {}) {
  return (err, _req, res, _next) => {
    if (res.headersSent) return;

    // Malformed JSON body.
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Request body is not valid JSON.' } });
    }
    if (err?.type === 'entity.too.large') {
      return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large.' } });
    }

    if (err instanceof AppError) {
      if (err.retryAfterMs) res.set('Retry-After', String(Math.ceil(err.retryAfterMs / 1000)));
      if (err.status >= 500) logger.warn?.(`[upstream] ${err.code}: ${err.message}`);
      return res.status(err.status).json({
        error: { code: err.code, message: err.message, retryable: err.retryable, details: err.details },
      });
    }

    logger.error?.('[unhandled]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side.' } });
  };
}
