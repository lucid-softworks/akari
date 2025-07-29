import "@/utils/intl-polyfills"; // Initialize Intl polyfills

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { QueryClient } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { LanguageProvider } from "@/contexts/LanguageContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import "@/utils/i18n";
import { secureStorage } from "@/utils/secureStorage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

const queryClient = new QueryClient();

const persister = createAsyncStoragePersister({
  storage: {
    getItem(key) {
      return secureStorage.getString(key);
    },
    setItem(key, value) {
      return secureStorage.set(key, value);
    },
    removeItem(key) {
      return secureStorage.delete(key);
    },
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LanguageProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister,
            dehydrateOptions: {
              shouldDehydrateQuery: (query) => {
                return !!query.meta?.persist;
              },
            },
          }}
        >
          <ThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <Stack>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </PersistQueryClientProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}
