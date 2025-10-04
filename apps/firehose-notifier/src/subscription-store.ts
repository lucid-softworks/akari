import { logger } from './logger.js';
import { parseSubscriptionPayload } from './subscription-utils.js';
import { normaliseDid } from './dids.js';
import type { NotifierRegistryConfig, Subscription } from './types.js';

const DEFAULT_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function createSubscriptionMap(subscriptions: Subscription[]): Map<string, Subscription> {
  return new Map(
    subscriptions.map((subscription) => {
      const key = normaliseDid(subscription.did) ?? subscription.did;
      return [key, subscription] as const;
    }),
  );
}

function resolveRefreshInterval(config?: NotifierRegistryConfig): number {
  if (!config?.refreshIntervalMs) {
    return DEFAULT_REFRESH_INTERVAL_MS;
  }

  return Math.max(30_000, config.refreshIntervalMs);
}

export class SubscriptionStore {
  private subscriptions: Map<string, Subscription> = new Map();
  private readonly registryConfig: NotifierRegistryConfig;
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor(config: NotifierRegistryConfig) {
    this.registryConfig = config;
  }

  async start(): Promise<void> {
    await this.refreshFromRegistry(true);

    const interval = resolveRefreshInterval(this.registryConfig);
    this.refreshTimer = setInterval(() => {
      void this.refreshFromRegistry(false);
    }, interval);
    this.refreshTimer.unref();
  }

  stop(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  get(did: string | null): Subscription | undefined {
    if (!did) return undefined;
    const key = normaliseDid(did) ?? did;
    return this.subscriptions.get(key);
  }

  private async refreshFromRegistry(failOnError: boolean): Promise<void> {
    try {
      const response = await fetch(this.registryConfig.endpoint, {
        headers: this.createHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Registry request failed with status ${response.status} ${response.statusText}`);
      }

      const payload = (await response.json()) as unknown;
      const subscriptions = parseSubscriptionPayload(payload, 'Registry response');
      this.subscriptions = createSubscriptionMap(subscriptions);

      logger.info('Loaded subscriptions from registry.', {
        subscriptions: this.subscriptions.size,
      });
    } catch (error) {
      logger.error('Failed to refresh subscriptions from registry.', {
        error: error instanceof Error ? error.message : error,
      });

      if (failOnError) {
        throw error instanceof Error ? error : new Error('Failed to load subscription registry.');
      }
    }
  }

  private createHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };

    if (this.registryConfig.bearerToken) {
      headers.Authorization = `Bearer ${this.registryConfig.bearerToken}`;
    }

    return headers;
  }
}
