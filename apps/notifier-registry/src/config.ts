import type { RegistryConfig } from './types.js';

function parsePort(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error('AKARI_REGISTRY_PORT must be a positive integer.');
  }
  return parsed;
}

export function loadConfig(): RegistryConfig {
  const host = process.env.AKARI_REGISTRY_HOST?.trim() || '0.0.0.0';
  const port = parsePort(process.env.AKARI_REGISTRY_PORT, 3001);
  const dataFile = process.env.AKARI_REGISTRY_DATA_FILE?.trim() || undefined;
  const adminToken = process.env.AKARI_REGISTRY_ADMIN_TOKEN?.trim() || undefined;
  const clientToken = process.env.AKARI_REGISTRY_CLIENT_TOKEN?.trim() || undefined;

  return {
    host,
    port,
    dataFile,
    adminToken,
    clientToken,
  } satisfies RegistryConfig;
}
