import { createCache } from './cache/index.js';
import type { InstrumentedCache } from './cache/index.js';
import { loadConfig } from './config.js';
import type { Config } from './config.js';
import { Logger } from './logger.js';
import { hdxNotImplemented } from './providers/hdx/index.js';
import { ProviderRegistry } from './providers/registry.js';
import { reliefwebNotImplemented } from './providers/reliefweb/index.js';
import { UnhcrProvider } from './providers/unhcr/index.js';
import { WorldBankProvider } from './providers/worldbank/index.js';
import { Analytics } from './shared/analytics.js';

/** Everything the server needs, built once at startup and injected everywhere. */
export interface AppContext {
  readonly config: Config;
  readonly logger: Logger;
  readonly cache: InstrumentedCache;
  readonly registry: ProviderRegistry;
  readonly analytics: Analytics;
}

export async function createContext(config: Config = loadConfig()): Promise<AppContext> {
  const logger = new Logger(config.logLevel);
  const cache = await createCache(config, logger);
  const registry = new ProviderRegistry();

  for (const id of config.providers) {
    switch (id) {
      case 'unhcr':
        registry.register(new UnhcrProvider(config, cache, logger));
        break;
      case 'worldbank':
        registry.register(new WorldBankProvider(config, cache, logger));
        break;
      case 'reliefweb':
        reliefwebNotImplemented();
        break;
      case 'hdx':
        hdxNotImplemented();
        break;
      default:
        throw new Error(
          `Unknown provider "${id}" in HMCP_PROVIDERS (known: unhcr, worldbank, reliefweb, hdx)`,
        );
    }
  }

  return {
    config,
    logger,
    cache,
    registry,
    analytics: new Analytics(config.analytics),
  };
}
