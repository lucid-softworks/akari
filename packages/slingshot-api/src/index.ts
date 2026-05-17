import { SlingshotApi } from './api';
import { SlingshotApiClient, DEFAULT_SLINGSHOT_BASE_URL } from './client';
import type { SlingshotClientOptions } from './client';

export { SlingshotApi };
export { SlingshotApiClient, DEFAULT_SLINGSHOT_BASE_URL };
export type { SlingshotClientOptions };
export type {
  SlingshotGetRecordQuery,
  SlingshotRecordResponse,
  SlingshotResolveHandleResponse,
} from './types';

export type SlingshotApiConfig = SlingshotClientOptions & {
  baseUrl?: string;
};

export const createSlingshotApi = (config: SlingshotApiConfig = {}): SlingshotApi => {
  const { baseUrl, headers, userAgent } = config;

  return new SlingshotApi(baseUrl ?? DEFAULT_SLINGSHOT_BASE_URL, {
    headers,
    userAgent,
  });
};
