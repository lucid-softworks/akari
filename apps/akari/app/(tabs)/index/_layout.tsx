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
      <Stack.Screen
        name="user-profile/[handle]/post/[rkey]"
        options={{
          title: 'Post',
          headerShown: isLargeNative,
          headerBackVisible: true,
        }}
        dangerouslySingular
      />
    </Stack>
  );
}
