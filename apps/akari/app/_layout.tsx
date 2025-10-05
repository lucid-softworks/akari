import '@/utils/intl-polyfills'; // Initialize Intl polyfills

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
              <Stack.Screen name="post" options={{ headerShown: false }} />
              <Stack.Screen name="profile" options={{ headerShown: false }} />
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

  return (
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
}
