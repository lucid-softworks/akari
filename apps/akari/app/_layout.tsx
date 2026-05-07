import '@/utils/polyfills/getRandomValues'; // Polyfills globalThis.crypto.getRandomValues via expo-crypto so @noble can sign DPoP proofs on Hermes
import '@/utils/intl-polyfills'; // Initialize Intl polyfills
import '@/utils/polyfills/silenceWebWarnings'; // Drop cosmetic-only RN warnings that flood the web console

import { DevPerformanceOverlay } from '@/components/DevPerformanceOverlay';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, useIsRestoring } from '@tanstack/react-query';
import {
  PersistQueryClientProvider,
  type PersistQueryClientProviderProps,
  type Persister,
} from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import { CrashProvider } from '@/axiom-crash-reporter';
import { DevServerBanner } from '@/components/DevServerBanner';
import { OAuthAccountBinder } from '@/components/OAuthAccountBinder';
import { OfflineBanner } from '@/components/OfflineBanner';
import { DialogProvider } from '@/contexts/DialogContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { setupBackgroundUpdates } from '@/utils/backgroundUpdates';
import { restoreOAuthBindingFromStorage } from '@/utils/oauth/clientBinding';
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

const REACT_QUERY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours
const REACT_QUERY_CACHE_BUSTER = 'akari@1';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: REACT_QUERY_CACHE_MAX_AGE,
      retry: 2,
    },
    dehydrate: {
      shouldDehydrateQuery: (query) => {
        // Never persist pending queries -- they cause hundreds of
        // "Uncaught (in promise) Error: redacted" on next hydration
        // because the original fetch promise is gone.
        return query.state.status === 'success';
      },
    },
  },
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
    try {
      storage.setItem(REACT_QUERY_CACHE_STORAGE_KEY, client);
    } catch (error) {
      if (__DEV__) console.error('Failed to persist React Query cache', error);
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

  if (isRestoring) {
    return null;
  }

  return (
    <LanguageProvider>
      <ToastProvider>
        <DialogProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <OAuthAccountBinder />
            <DevServerBanner />
            <OfflineBanner />
            <Stack>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="debug" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </DialogProvider>
      </ToastProvider>
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

  const appTree = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
          <AppProviders colorScheme={colorScheme} />
          {Platform.OS === 'web' ? (
            <ReactQueryDevtools initialIsOpen={false} position="left" buttonPosition="bottom-left" />
          ) : null}
          {__DEV__ ? <DevPerformanceOverlay /> : null}
        </PersistQueryClientProvider>
      </SafeAreaProvider>
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
