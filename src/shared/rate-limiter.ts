/**
 * Token-bucket rate limiter. One instance per provider guarantees we respect
 * upstream rate limits regardless of how many tools fire concurrently.
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly ratePerSecond: number,
    private readonly burst: number = Math.max(1, ratePerSecond),
    private readonly now: () => number = () => Date.now(),
    private readonly sleep: (ms: number) => Promise<void> = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms)),
  ) {
    this.tokens = this.burst;
    this.lastRefill = this.now();
  }

  /** Resolves when a token is available. Callers are served in FIFO order. */
  acquire(): Promise<void> {
    const turn = this.queue.then(() => this.takeToken());
    // Subsequent callers wait for this one, but a failure must not poison the queue.
    this.queue = turn.catch(() => undefined);
    return turn;
  }

  private async takeToken(): Promise<void> {
    this.refill();
    if (this.tokens < 1) {
      const deficitMs = ((1 - this.tokens) / this.ratePerSecond) * 1000;
      await this.sleep(Math.ceil(deficitMs));
      this.refill();
    }
    this.tokens = Math.max(0, this.tokens - 1);
  }

  private refill(): void {
    const elapsed = (this.now() - this.lastRefill) / 1000;
    this.tokens = Math.min(this.burst, this.tokens + elapsed * this.ratePerSecond);
    this.lastRefill = this.now();
  }
}
