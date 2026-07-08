import type { Cache, CacheEntry } from './types.js';

/**
 * In-memory LRU cache. Default backend; also the fallback when the sqlite
 * backend is unavailable on the running Node version.
 */
export class MemoryCache implements Cache {
  readonly backend = 'memory';
  private readonly entries = new Map<string, CacheEntry>();

  constructor(private readonly maxEntries = 2000) {}

  get(key: string): Promise<CacheEntry | undefined> {
    const entry = this.entries.get(key);
    if (entry) {
      // Refresh LRU position.
      this.entries.delete(key);
      this.entries.set(key, entry);
    }
    return Promise.resolve(entry);
  }

  set(key: string, entry: CacheEntry): Promise<void> {
    this.entries.delete(key);
    this.entries.set(key, entry);
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next();
      if (oldest.done) break;
      this.entries.delete(oldest.value);
    }
    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.entries.delete(key);
    return Promise.resolve();
  }

  clear(): Promise<void> {
    this.entries.clear();
    return Promise.resolve();
  }

  size(): Promise<number> {
    return Promise.resolve(this.entries.size);
  }
}
