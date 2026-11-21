import { describe, expect, it } from 'vitest';
import {
  CaptureRateLimiter,
  isCaptureQuotaError,
} from '../../src/background/rate-limiter';

describe('Task 011: CaptureRateLimiter (>= 550ms spacing & quota retry backoff)', () => {
  it('identifies Chrome MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND and quota errors', () => {
    expect(
      isCaptureQuotaError(
        new Error(
          'This request exceeds the MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND quota.',
        ),
      ),
    ).toBe(true);
    expect(isCaptureQuotaError(new Error('Rate limit exceeded'))).toBe(true);
    expect(isCaptureQuotaError(new Error('Tab was closed'))).toBe(false);
  });

  it('enforces a minimum 550ms interval between consecutive captureVisibleTab calls', async () => {
    let virtualNow = 1000;
    const sleepCalls: number[] = [];

    const limiter = new CaptureRateLimiter({
      minIntervalMs: 550,
      now: () => virtualNow,
      sleep: async (ms: number) => {
        sleepCalls.push(ms);
        virtualNow += ms;
      },
    });

    const firstResult = await limiter.schedule(async () => 'frame-1');
    expect(firstResult).toBe('frame-1');
    expect(sleepCalls).toEqual([]); // First call runs immediately

    // Advance only 150ms -> next call must sleep 400ms to reach 550ms interval
    virtualNow += 150;
    const secondResult = await limiter.schedule(async () => 'frame-2');
    expect(secondResult).toBe('frame-2');
    expect(sleepCalls).toEqual([400]);
  });

  it('retries up to 3 times with 600ms exponential backoff on quota errors', async () => {
    let virtualNow = 5000;
    const sleepCalls: number[] = [];

    const limiter = new CaptureRateLimiter({
      minIntervalMs: 550,
      retryBaseDelayMs: 600,
      maxRetries: 3,
      now: () => virtualNow,
      sleep: async (ms: number) => {
        sleepCalls.push(ms);
        virtualNow += ms;
      },
    });

    let attempts = 0;
    const result = await limiter.schedule(async () => {
      attempts += 1;
      if (attempts < 3) {
        throw new Error(
          'This request exceeds the MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND quota.',
        );
      }
      return 'captured-after-retry';
    });

    expect(result).toBe('captured-after-retry');
    expect(attempts).toBe(3);
    expect(sleepCalls).toEqual([600, 1200]);
  });
});
