import { Stack } from 'expo-router';

import { useResponsive } from '@/hooks/useResponsive';

export default function IndexLayout() {
  const { isLargeNative } = useResponsive();

  return (
    <Stack
      screenOptions={{
        headerShown: isLargeNative,
        headerBackVisible: true,
        headerBackButtonDisplayMode: 'minimal',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="user-profile/[handle]"
        options={{
          headerShown: false,
        }}
        dangerouslySingular
      />
      {/* The post-detail route is owned by user-profile/[handle]/_layout.tsx;
          declaring it again here as a sibling triggers expo-router's
          "Too many screens defined" warning. */}
    </Stack>
  );
}
