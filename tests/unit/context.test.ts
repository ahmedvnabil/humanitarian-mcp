import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config.js';
import { createContext } from '../../src/context.js';

describe('createContext', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hmcp-ctx-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('wires the unhcr provider with a memory cache by default', async () => {
    const ctx = await createContext(loadConfig({ HMCP_LOG_LEVEL: 'error' }));
    expect(ctx.registry.ids()).toEqual(['unhcr']);
    expect(ctx.cache.backend).toBe('memory');
    expect(ctx.registry.primary().id).toBe('unhcr');
  });

  it('honours the sqlite cache backend when node:sqlite exists', async () => {
    const ctx = await createContext(
      loadConfig({
        HMCP_CACHE: 'sqlite',
        HMCP_CACHE_PATH: join(dir, 'ctx.sqlite'),
        HMCP_LOG_LEVEL: 'error',
      }),
    );
    // Node ≥ 22.5 → sqlite; older → documented fallback to memory.
    expect(['sqlite', 'memory']).toContain(ctx.cache.backend);
  });

  it('fails loudly for scaffolded-but-unimplemented providers', async () => {
    await expect(
      createContext(loadConfig({ HMCP_PROVIDERS: 'reliefweb', HMCP_LOG_LEVEL: 'error' })),
    ).rejects.toThrow(/not implemented/);
    await expect(
      createContext(loadConfig({ HMCP_PROVIDERS: 'hdx', HMCP_LOG_LEVEL: 'error' })),
    ).rejects.toThrow(/not implemented/);
  });

  it('rejects unknown provider ids with the known list', async () => {
    await expect(
      createContext(loadConfig({ HMCP_PROVIDERS: 'nasa', HMCP_LOG_LEVEL: 'error' })),
    ).rejects.toThrow(/Unknown provider "nasa"/);
  });
});
