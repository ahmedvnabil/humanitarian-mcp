import { describe, expect, it } from 'vitest';
import { RateLimiter } from '../../src/shared/rate-limiter.js';

describe('RateLimiter', () => {
  it('lets a burst through immediately, then paces to the configured rate', async () => {
    let clock = 0;
    const sleeps: number[] = [];
    const limiter = new RateLimiter(
      2, // 2 rps
      2, // burst of 2
      () => clock,
      (ms) => {
        sleeps.push(ms);
        clock += ms;
        return Promise.resolve();
      },
    );

    await limiter.acquire();
    await limiter.acquire();
    expect(sleeps).toEqual([]); // burst tokens

    await limiter.acquire(); // must wait ~500ms for the next token at 2 rps
    expect(sleeps).toHaveLength(1);
    expect(sleeps[0]).toBeGreaterThanOrEqual(500);
  });

  it('refills tokens as time passes', async () => {
    let clock = 0;
    const sleeps: number[] = [];
    const limiter = new RateLimiter(
      1,
      1,
      () => clock,
      (ms) => {
        sleeps.push(ms);
        clock += ms;
        return Promise.resolve();
      },
    );

    await limiter.acquire();
    clock += 5000; // plenty of refill time
    await limiter.acquire();
    expect(sleeps).toEqual([]);
  });
});
