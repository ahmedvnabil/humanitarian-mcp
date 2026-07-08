import type { Config } from '../config.js';
import type { Logger } from '../logger.js';
import { MemoryCache } from './memory.js';
import { createSqliteCache } from './sqlite.js';
import { InstrumentedCache } from './types.js';

export type { Cache, CacheEntry, CacheStats } from './types.js';
export { InstrumentedCache } from './types.js';
export { MemoryCache } from './memory.js';
export { SqliteCache } from './sqlite.js';

/** Build the configured cache backend, falling back to memory when needed. */
export async function createCache(config: Config, logger: Logger): Promise<InstrumentedCache> {
  if (config.cacheBackend === 'sqlite') {
    const sqlite = await createSqliteCache(config.cachePath);
    if (sqlite) {
      logger.info('cache: sqlite backend ready', { path: config.cachePath });
      return new InstrumentedCache(sqlite);
    }
    logger.warn('cache: node:sqlite unavailable on this Node version, falling back to memory');
  }
  return new InstrumentedCache(new MemoryCache());
}
