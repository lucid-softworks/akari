import '@/utils/polyfills/arrayByCopy'; // Polyfills Array.prototype.{toSorted,toReversed,toSpliced,with} — Hermes/JSC on iOS still ship without them
import '@/utils/polyfills/getRandomValues'; // Polyfills globalThis.crypto.getRandomValues via expo-crypto so @noble can sign DPoP proofs on Hermes
import '@/utils/intl-polyfills'; // Initialize Intl polyfills
import '@/utils/polyfills/silenceWebWarnings'; // Drop cosmetic-only RN warnings that flood the web console

import { useFaviconSync } from '@/components/AppLogo';
import { DevPerformanceOverlay } from '@/components/DevPerformanceOverlay';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useIsRestoring } from '@tanstack/react-query';
import {
  PersistQueryClientProvider,
  type PersistQueryClientProviderProps,
  type Persister,
} from '@tanstack/react-query-persist-client';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import { CrashProvider } from '@/axiom-crash-reporter';
import { BuildWatermark } from '@/components/BuildWatermark';
import { DevServerBanner } from '@/components/DevServerBanner';
import { ExternalLinkConfirmHost } from '@/components/ExternalLinkConfirmHost';
import { OAuthAccountBinder } from '@/components/OAuthAccountBinder';
import { OfflineBanner } from '@/components/OfflineBanner';
import { DialogProvider } from '@/contexts/DialogContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { PlausibleAutoPageview, PlausibleProvider } from '@/utils/plausible';
import { setupBackgroundUpdates } from '@/utils/backgroundUpdates';
import { restoreOAuthBindingFromStorage } from '@/utils/oauth/clientBinding';
import {
  queryClient,
  REACT_QUERY_CACHE_BUSTER,
  REACT_QUERY_CACHE_MAX_AGE,
} from '@/utils/queryClient';
import { REACT_QUERY_CACHE_STORAGE_KEY, storage } from '@/utils/secureStorage';
import { bootstrapSecureStorage } from '@/utils/secureStorageBootstrap';
import '@/utils/i18n';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Platform } from 'react-native';
import type { Query } from '@tanstack/query-core';
import type { CrashProviderProps } from '@/axiom-crash-reporter';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://e8e7d85f238d070cde159aeed82d53b2@o4511173978619904.ingest.de.sentry.io/4511173979930704',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

/**
 * Trim every persisted infinite query down to its first page before handing
 * the cache back to React Query. Without this, a stale infinite query
 * rehydrates with N pages and React Query refetches every one on the first
 * subscribe — so a feed that accumulated 30 pages last session would fire
 * 30 getFeed requests on cold load. Persisting only the first page keeps
 * the offline-reopen-shows-content win without the cascade: subsequent
 * pages are fetched on demand as the user scrolls.
 */
function trimPersistedInfinitePages<T>(client: T): T {
  const root = client as { clientState?: { queries?: unknown[] } } | null | undefined;
  const queries = root?.clientState?.queries;
  if (!Array.isArray(queries)) return client;

  const trimmed = queries.map((entry) => {
    const q = entry as { state?: { data?: { pages?: unknown[]; pageParams?: unknown[] } } };
    const data = q.state?.data;
    if (!data || !Array.isArray(data.pages) || data.pages.length <= 1) return entry;
    return {
      ...q,
      state: {
        ...q.state,
        data: {
          ...data,
          pages: data.pages.slice(0, 1),
          pageParams: Array.isArray(data.pageParams) ? data.pageParams.slice(0, 1) : data.pageParams,
        },
      },
    };
  });

  return {
    ...(root as object),
    clientState: {
      ...(root!.clientState as object),
      queries: trimmed,
    },
  } as T;
}

const queryCachePersister: Persister = {
  persistClient: async (client) => {
    // Trim before write, not just before restore. Without this we
    // serialize every infinite-query page (a feed can accumulate 30+
    // pages in a session) which blows the web's localStorage quota.
    const trimmed = trimPersistedInfinitePages(client);
    try {
      storage.setItem(REACT_QUERY_CACHE_STORAGE_KEY, trimmed);
    } catch (error) {
      if (__DEV__) console.error('Failed to persist React Query cache', error);
      // QuotaExceededError on web: clear what we have so the next
      // persist starts from an empty slot rather than failing again
      // on the same oversized entry.
      try {
        storage.removeItem(REACT_QUERY_CACHE_STORAGE_KEY);
      } catch {
        // best-effort; nothing else to do
      }
    }
  },
  restoreClient: async () => {
    try {
      const cache = storage.getItem(REACT_QUERY_CACHE_STORAGE_KEY);
      if (!cache) return undefined;
      return trimPersistedInfinitePages(cache);
    } catch (error) {
      if (__DEV__) console.error('Failed to restore React Query cache', error);
      storage.removeItem(REACT_QUERY_CACHE_STORAGE_KEY);
      return undefined;
    }
  },
  removeClient: async () => {
    storage.removeItem(REACT_QUERY_CACHE_STORAGE_KEY);
  },
};

const persistOptions = {
  persister: queryCachePersister,
  maxAge: REACT_QUERY_CACHE_MAX_AGE,
  buster: REACT_QUERY_CACHE_BUSTER,
  dehydrateOptions: {
    shouldDehydrateMutation: () => false,
    shouldDehydrateQuery: (query: Query) =>
      query.state.status === 'success' && query.meta?.persist !== false,
  },
} satisfies PersistQueryClientProviderProps['persistOptions'];

type ProvidersProps = {
  colorScheme: ReturnType<typeof useColorScheme>;
};

type CrashReporterConfig = CrashProviderProps['axiomConfig'];

const rawAxiomToken = process.env.EXPO_PUBLIC_AXIOM_TOKEN?.trim();
const rawAxiomOrgId = process.env.EXPO_PUBLIC_AXIOM_ORG_ID?.trim();
const rawAxiomDataset = process.env.EXPO_PUBLIC_AXIOM_DATASET?.trim();

const rawPlausibleDomain = process.env.EXPO_PUBLIC_PLAUSIBLE_DOMAIN?.trim();
const rawPlausibleApiHost = process.env.EXPO_PUBLIC_PLAUSIBLE_API_HOST?.trim();
const plausibleDomain =
  rawPlausibleDomain && rawPlausibleDomain.length > 0 ? rawPlausibleDomain : 'akari.blue';
const plausibleApiHost =
  rawPlausibleApiHost && rawPlausibleApiHost.length > 0 ? rawPlausibleApiHost : undefined;
// Restrict tracking to the production variant so dev/preview/TestFlight
// traffic doesn't pollute the dashboard. Set
// EXPO_PUBLIC_PLAUSIBLE_DEV_TRACKING=1 in .env.local to force-enable
// from any variant when smoke-testing the integration.
const plausibleDevTracking = process.env.EXPO_PUBLIC_PLAUSIBLE_DEV_TRACKING?.trim() === '1';
const plausibleEnabled =
  Constants.expoConfig?.extra?.variant === 'production' || plausibleDevTracking;

const crashReporterConfig: CrashReporterConfig | null = rawAxiomToken
  ? {
      token: rawAxiomToken,
      ...(rawAxiomOrgId ? { orgId: rawAxiomOrgId } : {}),
      ...(rawAxiomDataset ? { dataset: rawAxiomDataset } : {}),
    }
  : null;

let hasLoggedMissingCrashReporterConfig = false;

function AppProviders({ colorScheme }: ProvidersProps) {
  const isRestoring = useIsRestoring();
  useFaviconSync();

  if (isRestoring) {
    return null;
  }

  return (
    <LanguageProvider>
      <PlausibleProvider
        domain={plausibleDomain}
        apiHost={plausibleApiHost}
        enabled={plausibleEnabled}
      >
        <ToastProvider>
          <DialogProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <OAuthAccountBinder />
              <DevServerBanner />
              <OfflineBanner />
              <PlausibleAutoPageview />
              <ExternalLinkConfirmHost />
              <Stack>
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="debug" options={{ headerShown: false }} />
                <Stack.Screen name="oauth/callback" options={{ headerShown: false }} />
                <Stack.Screen name="oauth/mastodon" options={{ headerShown: false }} />
                <Stack.Screen name="onboarding/mastodon" options={{ headerShown: false }} />
                <Stack.Screen name="onboarding/mastodon-follow" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" />
              </Stack>
              {/* oxlint-disable-next-line react/style-prop-object -- expo-status-bar's `style` prop is a string variant ("auto" | "light" | "dark"), not a React DOM style object */}
              <StatusBar style="auto" />
            </ThemeProvider>
          </DialogProvider>
        </ToastProvider>
      </PlausibleProvider>
    </LanguageProvider>
  );
}

export default Sentry.wrap(function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [secureStorageReady, setSecureStorageReady] = useState(false);

  useEffect(() => {
    setupBackgroundUpdates().catch((error) => {
      console.error('Failed to configure background updates:', error);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    bootstrapSecureStorage()
      .then(() => {
        // Re-bind the DPoP signer for an OAuth-authed persisted account
        // before flipping the ready flag, so the home tab's first XRPC
        // call sees the registry already populated.
        restoreOAuthBindingFromStorage();
        if (!cancelled) setSecureStorageReady(true);
        return undefined;
      })
      .catch((error) => {
        // Without secure storage we can't read/write JWTs or restore the
        // React Query cache; surface to Sentry and stay on the splash.
        Sentry.captureException(error);
        console.error('Failed to bootstrap secure storage:', error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded || !secureStorageReady) {
    // Async font loading only occurs in development.
    return null;
  }

  const isDevelopment = process.env.NODE_ENV !== 'production';
  // Stamp build info on screenshots for any non-dev variant so we can
  // identify which build a TestFlight tester was on from a screenshot.
  // We skip dev runs entirely (`__DEV__`) because expo-watermark's native
  // module isn't always linked into the dev client — without it,
  // requireNativeView falls back to expo-modules-core's "unimplemented"
  // placeholder and visibly paints "unimplemented" in the corner.
  const appVariant =
    typeof Constants.expoConfig?.extra?.variant === 'string'
      ? (Constants.expoConfig.extra.variant as string)
      : undefined;
  const showBuildWatermark =
    !__DEV__ && (appVariant === 'preview' || appVariant === 'production');

  const innerTree = (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <AppProviders colorScheme={colorScheme} />
        {Platform.OS === 'web' ? (
          <ReactQueryDevtools initialIsOpen={false} position="left" buttonPosition="bottom-left" />
        ) : null}
        {__DEV__ ? <DevPerformanceOverlay /> : null}
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );

  const appTree = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {showBuildWatermark ? <BuildWatermark>{innerTree}</BuildWatermark> : innerTree}
    </GestureHandlerRootView>
  );

  if (!crashReporterConfig) {
    if (isDevelopment && !hasLoggedMissingCrashReporterConfig) {
      console.warn(
        'Axiom crash reporting is disabled because EXPO_PUBLIC_AXIOM_TOKEN is not configured.',
      );
      hasLoggedMissingCrashReporterConfig = true;
    }

    return appTree;
  }

  return (
    <CrashProvider axiomConfig={crashReporterConfig} enableConsoleLogging={isDevelopment}>
      {appTree}
    </CrashProvider>
  );
});
