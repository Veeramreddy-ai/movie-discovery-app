/**
 * All errors that should reach the client as a clean JSON payload extend AppError.
 * Anything else is treated as a bug and returned as a generic 500.
 */
export class AppError extends Error {
  constructor(status, code, message, { details, retryable = false } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryable = retryable;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid request', details) {
    super(400, 'VALIDATION_ERROR', message, { details });
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends AppError {
  constructor(code, message) {
    super(409, code, message);
  }
}

/**
 * The third-party movie service failed. `retryable` tells the HTTP client whether another attempt
 * makes sense, and the cache whether serving stale data is appropriate.
 */
export class UpstreamError extends AppError {
  constructor(status, code, message, { retryable = true, retryAfterMs, details } = {}) {
    super(status, code, message, { retryable, details });
    this.retryAfterMs = retryAfterMs;
  }
}
