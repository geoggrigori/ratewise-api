import express, { type Express } from 'express';
import type { AppConfig } from './config.js';
import { tokenBucket } from './middleware/tokenBucket.js';
import { quoteRouter } from './routes/quote.js';

/**
 * Build the Express application.
 *
 * The `/health` endpoint is always unlimited; everything mounted under `/api`
 * is protected by the token-bucket rate limiter configured from {@link config}.
 *
 * @param config - Resolved application configuration.
 * @returns A configured (but not yet listening) Express app.
 */
export function createApp(config: AppConfig): Express {
  const app = express();

  // Honour X-Forwarded-For so client IPs are correct behind a proxy.
  app.set('trust proxy', true);
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const limiter = tokenBucket({
    capacity: config.rateCapacity,
    refillPerSecond: config.rateRefill,
  });

  app.use('/api', limiter, quoteRouter);

  return app;
}
