import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Options for configuring the {@link tokenBucket} middleware.
 */
export interface TokenBucketOptions {
  /**
   * Maximum number of tokens a bucket can hold. This also determines the
   * largest burst of requests a client may make after a period of inactivity.
   */
  capacity: number;
  /**
   * Number of tokens added back to a bucket every second. Controls the
   * sustained request rate once the initial burst is exhausted.
   */
  refillPerSecond: number;
  /**
   * Resolves the identity of the client for a request. Defaults to the
   * `x-api-key` header when present, otherwise the request IP address.
   */
  keyGenerator?: (req: Request) => string;
  /**
   * Clock function returning the current time in milliseconds. Injectable to
   * make time-based behaviour deterministic in tests. Defaults to `Date.now`.
   */
  now?: () => number;
}

/** Internal state for a single client's bucket. */
interface Bucket {
  /** Current number of available tokens (may be fractional). */
  tokens: number;
  /** Timestamp (ms) of the last refill calculation. */
  lastRefill: number;
}

/**
 * Default key generator: prefer the API key header, fall back to the IP.
 */
function defaultKeyGenerator(req: Request): string {
  const apiKey = req.header('x-api-key');
  if (apiKey && apiKey.trim().length > 0) {
    return `key:${apiKey.trim()}`;
  }
  return `ip:${req.ip ?? 'unknown'}`;
}

/**
 * Create an in-memory token-bucket rate-limiting middleware for Express.
 *
 * Each client (identified via {@link TokenBucketOptions.keyGenerator}) gets an
 * independent bucket that starts full. Every allowed request consumes one
 * token; buckets refill continuously at `refillPerSecond`. When a bucket is
 * empty the request is rejected with HTTP 429 and a `Retry-After` header.
 *
 * On every response the following headers are set:
 * - `X-RateLimit-Limit`: the bucket capacity.
 * - `X-RateLimit-Remaining`: whole tokens left after this request.
 *
 * @param options - Capacity, refill rate and optional injectables.
 * @returns An Express {@link RequestHandler}.
 */
export function tokenBucket(options: TokenBucketOptions): RequestHandler {
  const { capacity, refillPerSecond } = options;

  if (capacity <= 0) {
    throw new Error('tokenBucket: capacity must be a positive number');
  }
  if (refillPerSecond <= 0) {
    throw new Error('tokenBucket: refillPerSecond must be a positive number');
  }

  const keyGenerator = options.keyGenerator ?? defaultKeyGenerator;
  const now = options.now ?? Date.now;
  const store = new Map<string, Bucket>();

  /** Refill a bucket based on elapsed time, capped at capacity. */
  function refill(bucket: Bucket, currentTime: number): void {
    const elapsedSeconds = (currentTime - bucket.lastRefill) / 1000;
    if (elapsedSeconds <= 0) {
      return;
    }
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsedSeconds * refillPerSecond);
    bucket.lastRefill = currentTime;
  }

  return function rateLimit(req: Request, res: Response, next: NextFunction): void {
    const key = keyGenerator(req);
    const currentTime = now();

    let bucket = store.get(key);
    if (bucket === undefined) {
      bucket = { tokens: capacity, lastRefill: currentTime };
      store.set(key, bucket);
    } else {
      refill(bucket, currentTime);
    }

    res.setHeader('X-RateLimit-Limit', String(capacity));

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      res.setHeader('X-RateLimit-Remaining', String(Math.floor(bucket.tokens)));
      next();
      return;
    }

    // Not enough tokens: compute how long until one token is available.
    const tokensNeeded = 1 - bucket.tokens;
    const retryAfterSeconds = Math.ceil(tokensNeeded / refillPerSecond);

    res.setHeader('X-RateLimit-Remaining', '0');
    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(429).json({
      error: {
        code: 'rate_limit_exceeded',
        message: 'Too many requests. Please slow down and retry later.',
        retryAfter: retryAfterSeconds,
      },
    });
  };
}
