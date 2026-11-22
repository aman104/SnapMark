import { SCROLL_CAPTURE_THROTTLE_MS } from '../shared/constants';

export interface RateLimiterOptions {
  minIntervalMs?: number;
  retryBaseDelayMs?: number;
  maxRetries?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isCaptureQuotaError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  return (
    /MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND/i.test(message) ||
    /quota/i.test(message) ||
    /rate.?limit/i.test(message)
  );
}

/**
 * Enforces a minimum interval (>= 550 ms) between chrome.tabs.captureVisibleTab calls
 * and automatically retries with exponential backoff (600 ms * attempt) on quota errors.
 */
export class CaptureRateLimiter {
  private readonly minIntervalMs: number;
  private readonly retryBaseDelayMs: number;
  private readonly maxRetries: number;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private lastCallTimestamp: number = -Infinity;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(options: RateLimiterOptions = {}) {
    this.minIntervalMs = options.minIntervalMs ?? SCROLL_CAPTURE_THROTTLE_MS;
    this.retryBaseDelayMs = options.retryBaseDelayMs ?? 600;
    this.maxRetries = options.maxRetries ?? 3;
    this.now = options.now ?? (() => Date.now());
    this.sleep = options.sleep ?? defaultSleep;
  }

  public schedule<T>(task: () => Promise<T>): Promise<T> {
    const run = async (): Promise<T> => {
      const elapsed = this.now() - this.lastCallTimestamp;
      if (elapsed < this.minIntervalMs) {
        const waitMs = this.minIntervalMs - elapsed;
        if (waitMs > 0) {
          await this.sleep(waitMs);
        }
      }

      let attempt = 0;
      while (true) {
        try {
          this.lastCallTimestamp = this.now();
          const result = await task();
          this.lastCallTimestamp = this.now();
          return result;
        } catch (error) {
          attempt += 1;
          if (attempt > this.maxRetries || !isCaptureQuotaError(error)) {
            throw error;
          }
          const backoffMs = this.retryBaseDelayMs * attempt;
          await this.sleep(backoffMs);
        }
      }
    };

    const next = this.queue.then(run, run);
    this.queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }
}
