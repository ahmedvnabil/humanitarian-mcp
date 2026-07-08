import type { DatasetId, HumanitarianProvider } from './types.js';

/**
 * Holds the enabled providers. Tools never import a concrete provider —
 * they ask the registry for one that serves the dataset they need.
 */
export class ProviderRegistry {
  private readonly providers = new Map<string, HumanitarianProvider>();

  register(provider: HumanitarianProvider): void {
    if (this.providers.has(provider.id)) {
      throw new Error(`Provider "${provider.id}" is already registered`);
    }
    this.providers.set(provider.id, provider);
  }

  all(): HumanitarianProvider[] {
    return [...this.providers.values()];
  }

  ids(): string[] {
    return [...this.providers.keys()];
  }

  byId(id: string): HumanitarianProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * The provider that serves `dataset`, honouring registration order.
   * Throws a clear error when nothing serves it — tools surface that message.
   */
  async forDataset(dataset: DatasetId): Promise<HumanitarianProvider> {
    for (const provider of this.providers.values()) {
      const meta = await provider.metadata();
      if (meta.datasets.some((d) => d.id === dataset)) return provider;
    }
    throw new Error(
      `No enabled provider serves the "${dataset}" dataset (enabled: ${this.ids().join(', ') || 'none'})`,
    );
  }

  /** First registered provider — used for country search/resolution. */
  primary(): HumanitarianProvider {
    const first = this.providers.values().next();
    if (first.done) throw new Error('No providers are enabled');
    return first.value;
  }
}
