import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Cache, CacheEntry } from './types.js';

/**
 * SQLite-backed cache using the built-in `node:sqlite` module (Node >= 22.5).
 * No native npm dependencies. Construct via {@link createSqliteCache}, which
 * returns undefined when `node:sqlite` is unavailable so callers can fall back
 * to the memory backend.
 */

interface SqliteRow {
  body: string;
  etag: string | null;
  fetched_at: number;
}

// Minimal structural type for node:sqlite's DatabaseSync — avoids requiring
// the module's types on Node versions that don't ship it.
interface SqliteDatabase {
  exec(sql: string): void;
  prepare(sql: string): {
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  };
}

export class SqliteCache implements Cache {
  readonly backend = 'sqlite';

  constructor(private readonly db: SqliteDatabase) {
    this.db.exec(
      `CREATE TABLE IF NOT EXISTS http_cache (
         key TEXT PRIMARY KEY,
         body TEXT NOT NULL,
         etag TEXT,
         fetched_at INTEGER NOT NULL
       )`,
    );
  }

  get(key: string): Promise<CacheEntry | undefined> {
    const row = this.db
      .prepare('SELECT body, etag, fetched_at FROM http_cache WHERE key = ?')
      .get(key) as SqliteRow | undefined;
    if (!row) return Promise.resolve(undefined);
    return Promise.resolve({
      body: row.body,
      ...(row.etag !== null ? { etag: row.etag } : {}),
      fetchedAt: row.fetched_at,
    });
  }

  set(key: string, entry: CacheEntry): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO http_cache (key, body, etag, fetched_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET body=excluded.body, etag=excluded.etag, fetched_at=excluded.fetched_at`,
      )
      .run(key, entry.body, entry.etag ?? null, entry.fetchedAt);
    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.db.prepare('DELETE FROM http_cache WHERE key = ?').run(key);
    return Promise.resolve();
  }

  clear(): Promise<void> {
    this.db.exec('DELETE FROM http_cache');
    return Promise.resolve();
  }

  size(): Promise<number> {
    const row = this.db.prepare('SELECT COUNT(*) AS n FROM http_cache').get() as { n: number };
    return Promise.resolve(row.n);
  }
}

/** Open (or create) the sqlite cache; undefined when node:sqlite is missing. */
export async function createSqliteCache(path: string): Promise<SqliteCache | undefined> {
  try {
    const sqlite = (await import('node:sqlite')) as {
      DatabaseSync: new (path: string) => SqliteDatabase;
    };
    mkdirSync(dirname(path), { recursive: true });
    return new SqliteCache(new sqlite.DatabaseSync(path));
  } catch {
    return undefined;
  }
}
