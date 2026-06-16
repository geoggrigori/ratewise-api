import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { AppConfig } from '../src/config.js';

const baseConfig: AppConfig = { port: 3000, rateCapacity: 5, rateRefill: 1 };

describe('createApp', () => {
  it('serves /health without rate limiting', async () => {
    const app = createApp(baseConfig);
    for (let i = 0; i < 20; i += 1) {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
      expect(res.headers['x-ratelimit-limit']).toBeUndefined();
    }
  });

  it('serves a random quote from /api/quote', async () => {
    const app = createApp(baseConfig);
    const res = await request(app).get('/api/quote');
    expect(res.status).toBe(200);
    expect(res.body.quote).toMatchObject({
      text: expect.any(String),
      author: expect.any(String),
    });
    expect(res.headers['x-ratelimit-limit']).toBe('5');
  });

  it('rate-limits /api/quote after capacity is exhausted', async () => {
    const app = createApp({ ...baseConfig, rateCapacity: 3, rateRefill: 0.001 });

    await request(app).get('/api/quote').expect(200);
    await request(app).get('/api/quote').expect(200);
    await request(app).get('/api/quote').expect(200);

    const denied = await request(app).get('/api/quote');
    expect(denied.status).toBe(429);
    expect(denied.headers['retry-after']).toBeDefined();
  });
});
