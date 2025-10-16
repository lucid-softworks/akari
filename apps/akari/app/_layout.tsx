import '@/utils/intl-polyfills'; // Initialize Intl polyfills

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, useIsRestoring } from '@tanstack/react-query';
import {
  PersistQueryClientProvider,
  type PersistQueryClientProviderProps,
  type Persister,
} from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import { CrashProvider } from '@/axiom-crash-reporter';
import { DialogProvider } from '@/contexts/DialogContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { setupBackgroundUpdates } from '@/utils/backgroundUpdates';
import { REACT_QUERY_CACHE_STORAGE_KEY, storage } from '@/utils/secureStorage';
import '@/utils/i18n';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Platform } from 'react-native';
import { useCurrentRouteDevToolsPlugin } from '@akari/devtools-current-route';
import type { Query } from '@tanstack/query-core';
import type { CrashProviderProps } from '@/axiom-crash-reporter';

const REACT_QUERY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours
const REACT_QUERY_CACHE_BUSTER = 'akari@1';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: REACT_QUERY_CACHE_MAX_AGE,
    },
  },
});

const queryCachePersister: Persister = {
  persistClient: async (client) => {
    try {
      storage.setItem(REACT_QUERY_CACHE_STORAGE_KEY, client);
    } catch (error) {
      console.error('Failed to persist React Query cache', error);
    }
  },
  restoreClient: async () => {
    try {
      const cache = storage.getItem(REACT_QUERY_CACHE_STORAGE_KEY);
      return cache ?? undefined;
    } catch (error) {
      console.error('Failed to restore React Query cache', error);
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
    shouldDehydrateQuery: (query: Query) => query.meta?.persist !== false,
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
            <Stack>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="debug" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="auto" />
            <CurrentRouteDevtoolsBridge />
          </ThemeProvider>
        </DialogProvider>
      </ToastProvider>
    </LanguageProvider>
  );
}

function CurrentRouteDevtoolsBridge() {
  const pathname = usePathname();

  useCurrentRouteDevToolsPlugin(pathname ?? null);

  return null;
}

export default function RootLayout() {
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
}
