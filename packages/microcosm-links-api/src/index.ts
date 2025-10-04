import { MicrocosmLinksApi } from './api';
import { MicrocosmApiClient, DEFAULT_MICROCOSM_BASE_URL } from './client';
import type { MicrocosmClientOptions } from './client';

export { MicrocosmLinksApi };
export { MicrocosmApiClient, DEFAULT_MICROCOSM_BASE_URL };
export type { MicrocosmClientOptions };
export type {
  MicrocosmBacklinkRecord,
  MicrocosmBacklinksQuery,
  MicrocosmBacklinksResponse,
  MicrocosmManyToManyCount,
  MicrocosmManyToManyCountsQuery,
  MicrocosmManyToManyCountsResponse,
} from './types';

export type MicrocosmLinksApiConfig = MicrocosmClientOptions & {
  baseUrl?: string;
};

export const createMicrocosmLinksApi = (config: MicrocosmLinksApiConfig = {}): MicrocosmLinksApi => {
  const { baseUrl, headers, userAgent } = config;

  return new MicrocosmLinksApi(baseUrl ?? DEFAULT_MICROCOSM_BASE_URL, {
    headers,
    userAgent,
  });
};
