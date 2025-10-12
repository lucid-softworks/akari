import '@/utils/intl-polyfills';

import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider, useIsRestoring } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';

import { AppTabBar } from '@/components/AppTabBar';
import { Sidebar } from '@/components/Sidebar';
import { DialogProvider } from '@/contexts/DialogContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { TabProvider } from '@/contexts/TabContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { useResponsive } from '@/hooks/useResponsive';
import { useTabRouteTracker } from '@/hooks/useTabRouteTracker';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav colorScheme={colorScheme || 'light'} />;
}

type ProvidersProps = {
  colorScheme: 'light' | 'dark';
};

function AppProviders({ colorScheme }: ProvidersProps) {
  const isRestoring = useIsRestoring();

  if (isRestoring) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ToastProvider>
          <DialogProvider>
            <TabProvider>
              <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <AppWithTabBar />
                <StatusBar style="auto" />
              </ThemeProvider>
            </TabProvider>
          </DialogProvider>
        </ToastProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

function AppWithTabBar() {
  const { isLargeScreen } = useResponsive();

  // Track route changes to update tab state
  useTabRouteTracker();

  if (isLargeScreen) {
    return (
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <Sidebar />
        <View style={{ flex: 1 }}>
          <Stack>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="search" options={{ headerShown: false }} />
            <Stack.Screen name="messages" options={{ headerShown: false }} />
            <Stack.Screen name="notifications" options={{ headerShown: false }} />
            <Stack.Screen name="profile" options={{ headerShown: false }} />
            <Stack.Screen name="post" options={{ headerShown: false }} />
            <Stack.Screen name="bookmarks" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <Stack.Screen name="debug" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack
        screenOptions={{
          // Disable animations globally on mobile to prevent between-tab animations
          animation: Platform.OS === 'web' ? 'default' : 'none',
          // Set animation duration to 0 on mobile
          animationDuration: Platform.OS === 'web' ? undefined : 0,
          // Enable gesture navigation for swipe-back
          gestureEnabled: true,
          // Use card presentation for proper navigation stack
          presentation: 'card',
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false }} />
        <Stack.Screen name="messages" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="post" options={{ headerShown: false }} />
        <Stack.Screen name="bookmarks" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="debug" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <AppTabBar />
    </>
  );
}

function RootLayoutNav({ colorScheme }: ProvidersProps) {
  return <AppProviders colorScheme={colorScheme} />;
}
