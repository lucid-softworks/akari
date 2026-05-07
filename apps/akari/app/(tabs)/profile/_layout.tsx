import { Stack } from 'expo-router';
import { Platform } from 'react-native';

import { useResponsive } from '@/hooks/useResponsive';

// Web uses the sidebar layout (see (tabs)/_layout.tsx) and provides its own
// in-page navigation, so a Stack header on top of that is just a duplicate
// row. On native we keep the header for the iOS back-swipe affordance and
// the Android back arrow.
const SHOW_STACK_HEADER = Platform.OS !== 'web';

export default function ProfileLayout() {
  const { isLargeNative } = useResponsive();

  return (
    <Stack
      screenOptions={{
        headerShown: isLargeNative,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="[handle]/index"
        options={({ route }) => ({
          headerShown: SHOW_STACK_HEADER,
          headerBackVisible: true,
          headerBackButtonDisplayMode: 'minimal',
          headerTitle: `@${(route.params as { handle?: string })?.handle ?? ''}`,
        })}
        dangerouslySingular
      />
      <Stack.Screen
        name="[handle]/post/[rkey]"
        options={{
          title: 'Post',
          headerShown: SHOW_STACK_HEADER,
          headerBackVisible: true,
          headerBackButtonDisplayMode: 'minimal',
        }}
        dangerouslySingular
      />
    </Stack>
  );
}
