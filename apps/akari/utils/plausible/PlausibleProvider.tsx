import { useSegments } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { MMKV, useMMKVBoolean } from 'react-native-mmkv';

import { buildUserAgent, getAppProps } from '@/utils/plausible/userAgent';

const DEFAULT_API_HOST = 'https://plausible.io';
const OPT_OUT_KEY = 'plausibleOptOut';

// Separate MMKV instance from secureStorage — analytics consent isn't
// secret, doesn't need encryption, and shouldn't get cleared when the
// secure store is wiped on logout.
const analyticsStorage = new MMKV({ id: 'analytics-prefs' });

type PlausibleConfig = {
  domain: string;
  apiHost: string;
  enabled: boolean;
};

export type TrackEventInput = {
  name: string;
  /**
   * Override the synthetic URL (defaults to the current Expo Router
   * pathname template under https://<domain>). Useful for events that
   * fire outside a screen, e.g. background tasks.
   */
  url?: string;
  props?: Record<string, string | number | boolean | null>;
};

type PlausibleContextValue = {
  config: PlausibleConfig;
  track: (input: TrackEventInput) => Promise<void>;
};

const PlausibleContext = createContext<PlausibleContextValue | null>(null);

export type PlausibleProviderProps = {
  domain: string;
  apiHost?: string;
  /** Override to disable tracking globally (e.g. dev builds, missing config). */
  enabled?: boolean;
  children: ReactNode;
};

export function PlausibleProvider({
  domain,
  apiHost = DEFAULT_API_HOST,
  enabled = true,
  children,
}: PlausibleProviderProps) {
  const config = useMemo<PlausibleConfig>(
    () => ({
      domain,
      apiHost: apiHost.replace(/\/$/, ''),
      enabled,
    }),
    [domain, apiHost, enabled],
  );

  const track = useCallback(
    async (input: TrackEventInput): Promise<void> => {
      if (!config.enabled) return;
      if (isOptedOut()) return;

      const url = input.url ?? `https://${config.domain}/`;
      const userAgent = buildUserAgent();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (userAgent) headers['User-Agent'] = userAgent;

      const body = {
        name: input.name,
        url,
        domain: config.domain,
        props: { ...getAppProps(), ...(input.props ?? {}) },
      };

      try {
        await fetch(`${config.apiHost}/api/event`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
      } catch (error) {
        if (__DEV__) console.warn('Plausible event failed', error);
      }
    },
    [config],
  );

  const value = useMemo(() => ({ config, track }), [config, track]);

  return (
    <PlausibleContext.Provider value={value}>
      {children}
    </PlausibleContext.Provider>
  );
}

function usePlausibleContext(): PlausibleContextValue {
  const ctx = useContext(PlausibleContext);
  if (!ctx) {
    throw new Error('usePlausible must be used inside a PlausibleProvider');
  }
  return ctx;
}

export function useTrackEvent(): (input: TrackEventInput) => Promise<void> {
  return usePlausibleContext().track;
}

/**
 * Mount once near the top of the navigation tree to fire a `pageview`
 * event whenever the active route changes. Uses Expo Router segments so
 * dynamic params (`[handle]`, `[id]`) are reported as templates rather
 * than user-identifying values, keeping the dashboard clean and avoiding
 * leaking handles / post IDs into analytics.
 */
export function PlausibleAutoPageview() {
  const segments = useSegments();
  const { config, track } = usePlausibleContext();

  useEffect(() => {
    if (!config.enabled) return;
    const path = normalizeSegments(segments as string[]);
    void track({
      name: 'pageview',
      url: `https://${config.domain}${path}`,
    });
  }, [segments, track, config.enabled, config.domain]);

  return null;
}

function normalizeSegments(segments: string[]): string {
  const cleaned = segments.filter((seg) => !(seg.startsWith('(') && seg.endsWith(')')));
  return cleaned.length === 0 ? '/' : `/${cleaned.join('/')}`;
}

export function useAnalyticsOptOut(): {
  optedOut: boolean;
  setOptedOut: (next: boolean) => void;
} {
  const [stored, setStored] = useMMKVBoolean(OPT_OUT_KEY, analyticsStorage);
  const optedOut = stored ?? false;
  const setOptedOut = useCallback(
    (next: boolean) => setStored(next),
    [setStored],
  );
  return { optedOut, setOptedOut };
}

function isOptedOut(): boolean {
  return analyticsStorage.getBoolean(OPT_OUT_KEY) === true;
}
