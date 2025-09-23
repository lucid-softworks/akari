import { useQuery } from '@tanstack/react-query';

const LIVE_CONFIG_URL = 'https://api.bsky.app/xrpc/app.bsky.unspecced.getConfig';
const LIVE_CONFIG_QUERY_KEY = ['liveNowConfig'];

type LiveNowEntry = {
  did: string;
  domains: string[];
};

type LiveConfigResponse = {
  liveNow?: LiveNowEntry[];
};

export const useLiveNow = () => {
  return useQuery<LiveNowEntry[]>({
    queryKey: LIVE_CONFIG_QUERY_KEY,
    queryFn: async () => {
      try {
        const response = await fetch(LIVE_CONFIG_URL, {
          headers: {
            'atproto-proxy': 'did:web:api.bsky.app#bsky_appview',
          },
        });

        if (!response.ok) {
          return [];
        }

        const data = (await response.json()) as LiveConfigResponse;
        return data.liveNow ?? [];
      } catch (error) {
        if (__DEV__) {
          console.warn('Failed to fetch Bluesky live config', error);
        }

        return [];
      }
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
  });
};

export type { LiveNowEntry };
