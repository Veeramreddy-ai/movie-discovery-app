import fs from 'node:fs';
import path from 'node:path';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { createErrorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createMoviesRouter } from './routes/movies.js';
import { createWishlistRouter } from './routes/wishlist.js';

export function createApp({
  movieService,
  wishlistRepository,
  corsOrigins = [],
  clientDistDir,
  imageHosts = ['https://image.tmdb.org'],
  logger = console,
  logRequests = false,
  rateLimitPerMinute = 300,
}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'img-src': ["'self'", 'data:', ...imageHosts],
          'upgrade-insecure-requests': null,
        },
      },
    }),
  );
  app.use(compression());
  app.use(cors({ origin: corsOrigins, allowedHeaders: ['Content-Type', 'X-Client-Id'] }));
  app.use(express.json({ limit: '10kb' }));

  if (logRequests) {
    app.use((req, res, next) => {
      const start = process.hrtime.bigint();
      res.on('finish', () => {
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        logger.info?.(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(0)}ms`);
      });
      next();
    });
  }

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  // Inbound rate limit: protects our own server and, indirectly, our TMDB quota.
  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: rateLimitPerMinute,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      handler: (_req, res) =>
        res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' } }),
    }),
  );

  app.use('/api', createMoviesRouter({ movieService }));
  app.use('/api/wishlist', createWishlistRouter({ movieService, wishlistRepository }));
  app.use('/api', notFoundHandler);

  // Production convenience: if the client has been built, serve it from the same origin (no CORS needed).
  if (clientDistDir && fs.existsSync(path.join(clientDistDir, 'index.html'))) {
    app.use(express.static(clientDistDir, { index: false, maxAge: '1h' }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      res.sendFile(path.join(clientDistDir, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(createErrorHandler({ logger }));
  return app;
}
