import type { BlueskyIpConfigResponse } from './types';

const BLUESKY_IP_CONFIG_URL = 'https://ip.bsky.app/config';

/**
 * Fetches geographic age restriction configuration for the current IP address
 */
export async function getBlueskyIpConfig(): Promise<BlueskyIpConfigResponse> {
  const response = await fetch(BLUESKY_IP_CONFIG_URL);

  if (!response.ok) {
    const statusText = response.statusText ? ` ${response.statusText}` : '';
    throw new Error(`Failed to fetch Bluesky IP config: HTTP ${response.status}${statusText}`);
  }

  const config = (await response.json()) as BlueskyIpConfigResponse;

  return config;
}
