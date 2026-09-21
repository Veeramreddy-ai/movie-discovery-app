import { ValidationError } from '../lib/errors.js';

const CLIENT_ID_PATTERN = /^[A-Za-z0-9-]{16,64}$/;

/**
 * The app has no accounts. Each browser generates a random id once, keeps it in localStorage and sends it
 * as `X-Client-Id`; the wishlist is stored against that id. It is a convenience identifier, NOT an
 * authentication mechanism - anyone who knows the id can read that wishlist (see README, "Known limitations").
 */
export function requireClientId(req, _res, next) {
  const id = req.get('x-client-id');
  if (!id || !CLIENT_ID_PATTERN.test(id)) {
    return next(new ValidationError('A valid X-Client-Id header is required.'));
  }
  req.clientId = id;
  next();
}
