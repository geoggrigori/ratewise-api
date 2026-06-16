/**
 * Application configuration resolved from environment variables.
 *
 * All values fall back to sensible defaults so the server can run
 * out of the box without any configuration.
 */
export interface AppConfig {
  /** Port the HTTP server listens on. */
  readonly port: number;
  /** Maximum number of tokens a bucket can hold (burst capacity). */
  readonly rateCapacity: number;
  /** Tokens added back to a bucket per second. */
  readonly rateRefill: number;
}

function parsePositiveNumber(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

/**
 * Build the application configuration from the given environment.
 *
 * @param env - Source of environment variables (defaults to `process.env`).
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: parsePositiveNumber(env.PORT, 3000),
    rateCapacity: parsePositiveNumber(env.RATE_CAPACITY, 10),
    rateRefill: parsePositiveNumber(env.RATE_REFILL, 1),
  };
}
