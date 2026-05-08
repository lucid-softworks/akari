import { Stack } from 'expo-router';

import { useResponsive } from '@/hooks/useResponsive';

export default function UserProfileLayout() {
  const { isLargeNative } = useResponsive();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="feed/[rkey]"
        options={{
          title: 'Feed',
          headerShown: isLargeNative,
          headerBackVisible: true,
          headerBackButtonDisplayMode: 'minimal',
        }}
        dangerouslySingular
      />
      <Stack.Screen
        name="post/[rkey]"
        options={{
          title: 'Post',
          headerShown: isLargeNative,
          headerBackVisible: true,
          headerBackButtonDisplayMode: 'minimal',
        }}
        dangerouslySingular
      />
    </Stack>
  );
}
