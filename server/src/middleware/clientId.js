import { ValidationError } from '../lib/errors.js';

const CLIENT_ID_PATTERN = /^[A-Za-z0-9-]{16,64}$/;


export function requireClientId(req, _res, next) {
  const id = req.get('x-client-id');
  if (!id || !CLIENT_ID_PATTERN.test(id)) {
    return next(new ValidationError('A valid X-Client-Id header is required.'));
  }
  req.clientId = id;
  next();
}
