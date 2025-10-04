import { logger } from './logger.js';
import type { NotifierConfig, NotifierRegistryConfig } from './types.js';

function parseRegistryConfig(): NotifierRegistryConfig {
  const endpoint = process.env.AKARI_NOTIFIER_REGISTRY_URL?.trim();
  if (!endpoint) {
    throw new Error('AKARI_NOTIFIER_REGISTRY_URL is required.');
  }

  const bearerToken = process.env.AKARI_NOTIFIER_REGISTRY_TOKEN?.trim();
  const refreshRaw = process.env.AKARI_NOTIFIER_REGISTRY_REFRESH_MS?.trim();

  let refreshIntervalMs: number | undefined;

  if (refreshRaw) {
    const parsed = Number.parseInt(refreshRaw, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      throw new Error('AKARI_NOTIFIER_REGISTRY_REFRESH_MS must be a positive integer representing milliseconds.');
    }
    refreshIntervalMs = parsed;
  }

  return { endpoint, bearerToken, refreshIntervalMs } satisfies NotifierRegistryConfig;
}

export function loadConfig(): NotifierConfig {
  const expoAccessToken = process.env.AKARI_EXPO_ACCESS_TOKEN?.trim();
  const registry = parseRegistryConfig();

  logger.info('Loaded notifier configuration.', {
    registryEndpoint: registry.endpoint,
    registryRefreshMs: registry.refreshIntervalMs,
    expoAccessTokenConfigured: Boolean(expoAccessToken),
  });

  return {
    expoAccessToken,
    registry,
  } satisfies NotifierConfig;
}
