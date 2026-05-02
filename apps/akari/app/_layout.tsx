import '@/utils/intl-polyfills'; // Initialize Intl polyfills

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
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import { CrashProvider } from '@/axiom-crash-reporter';
import { OfflineBanner } from '@/components/OfflineBanner';
import { DialogProvider } from '@/contexts/DialogContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { setupBackgroundUpdates } from '@/utils/backgroundUpdates';
import { REACT_QUERY_CACHE_STORAGE_KEY, storage } from '@/utils/secureStorage';
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
      return cache ?? undefined;
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

  useEffect(() => {
    setupBackgroundUpdates().catch((error) => {
      console.error('Failed to configure background updates:', error);
    });
  }, []);

  if (!loaded) {
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
