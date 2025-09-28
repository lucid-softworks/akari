import { ConstellationApi } from './api';
import { ConstellationApiClient, DEFAULT_CONSTELLATION_BASE_URL } from './client';
import type { ConstellationClientOptions } from './client';

export { ConstellationApi };
export { ConstellationApiClient, DEFAULT_CONSTELLATION_BASE_URL };
export type { ConstellationClientOptions };
export type {
  ConstellationAllLinksQuery,
  ConstellationAllLinksResponse,
  ConstellationCountQuery,
  ConstellationCountResponse,
  ConstellationDistinctDidCountResponse,
  ConstellationDistinctDidsResponse,
  ConstellationLinkAggregate,
  ConstellationLinkRecord,
  ConstellationLinksQuery,
  ConstellationLinksResponse,
  ConstellationServerInfo,
  ConstellationStats,
} from './types';

export type ConstellationApiConfig = ConstellationClientOptions & {
  baseUrl?: string;
};

export const createConstellationApi = (config: ConstellationApiConfig = {}): ConstellationApi => {
  const { baseUrl, headers, userAgent } = config;

  return new ConstellationApi(baseUrl ?? DEFAULT_CONSTELLATION_BASE_URL, {
    headers,
    userAgent,
  });
};
