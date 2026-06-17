import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { tokenBucket } from '../src/middleware/tokenBucket.js';

/**
 * Build a minimal app with a controllable clock so refill behaviour can be
 * tested deterministically without real timers.
 */
function buildApp(options: {
  capacity: number;
  refillPerSecond: number;
  clock: { value: number };
}) {
  const app = express();
  app.use(
    tokenBucket({
      capacity: options.capacity,
      refillPerSecond: options.refillPerSecond,
      now: () => options.clock.value,
      // Stable key so all requests share one bucket regardless of IP.
      keyGenerator: () => 'test-client',
    }),
  );
  app.get('/', (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe('tokenBucket middleware', () => {
  it('allows requests while tokens remain under the limit', async () => {
    const clock = { value: 0 };
    const app = buildApp({ capacity: 3, refillPerSecond: 1, clock });

    for (let i = 0; i < 3; i += 1) {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    }
  });

  it('returns 429 on the (capacity + 1)th request', async () => {
    const clock = { value: 0 };
    const app = buildApp({ capacity: 2, refillPerSecond: 1, clock });

    await request(app).get('/').expect(200);
    await request(app).get('/').expect(200);

    const denied = await request(app).get('/');
    expect(denied.status).toBe(429);
    expect(denied.body).toEqual({
      error: {
        code: 'rate_limit_exceeded',
        message: expect.any(String),
        retryAfter: expect.any(Number),
      },
    });
  });

  it('sets rate-limit headers that decrement and includes Retry-After on deny', async () => {
    const clock = { value: 0 };
    const app = buildApp({ capacity: 3, refillPerSecond: 1, clock });

    const first = await request(app).get('/');
    expect(first.headers['x-ratelimit-limit']).toBe('3');
    expect(first.headers['x-ratelimit-remaining']).toBe('2');

    const second = await request(app).get('/');
    expect(second.headers['x-ratelimit-remaining']).toBe('1');

    const third = await request(app).get('/');
    expect(third.headers['x-ratelimit-remaining']).toBe('0');

    const denied = await request(app).get('/');
    expect(denied.status).toBe(429);
    expect(denied.headers['x-ratelimit-remaining']).toBe('0');
    expect(denied.headers['retry-after']).toBe('1');
  });

  it('sets X-RateLimit-Reset on allowed responses to the current epoch second', async () => {
    const clock = { value: 5_000 };
    const app = buildApp({ capacity: 3, refillPerSecond: 1, clock });

    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    // 5_000 ms => epoch second 5; a token is available now, so reset is "now".
    expect(res.headers['x-ratelimit-reset']).toBe('5');
  });

  it('sets X-RateLimit-Reset on 429 to when a token becomes available', async () => {
    const clock = { value: 10_000 };
    const app = buildApp({ capacity: 1, refillPerSecond: 1, clock });

    // Drain the single token.
    await request(app).get('/').expect(200);

    const denied = await request(app).get('/');
    expect(denied.status).toBe(429);
    // now = 10s, need 1 token at 1/sec => reset 1s in the future.
    expect(denied.headers['x-ratelimit-reset']).toBe('11');
    // Reset and Retry-After must agree: reset === now + retryAfter.
    expect(Number(denied.headers['x-ratelimit-reset'])).toBe(
      10 + Number(denied.headers['retry-after']),
    );
  });

  it('refills tokens after waiting', async () => {
    const clock = { value: 0 };
    const app = buildApp({ capacity: 1, refillPerSecond: 2, clock });

    // Consume the only token.
    await request(app).get('/').expect(200);
    // Bucket is empty now.
    await request(app).get('/').expect(429);

    // Advance the clock by 500ms => 1 token refilled at 2 tokens/sec.
    clock.value += 500;
    await request(app).get('/').expect(200);
  });

  it('tracks separate buckets per client key', async () => {
    const app = express();
    app.use(
      tokenBucket({
        capacity: 1,
        refillPerSecond: 1,
        keyGenerator: (req) => req.header('x-api-key') ?? 'anon',
      }),
    );
    app.get('/', (_req, res) => {
      res.json({ ok: true });
    });

    await request(app).get('/').set('x-api-key', 'alice').expect(200);
    await request(app).get('/').set('x-api-key', 'alice').expect(429);
    // Bob has his own full bucket.
    await request(app).get('/').set('x-api-key', 'bob').expect(200);
  });
});
