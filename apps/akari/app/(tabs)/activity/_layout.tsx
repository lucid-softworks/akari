import { Stack } from 'expo-router';

import { useResponsive } from '@/hooks/useResponsive';

export default function NotificationsLayout() {
  const { isLargeScreen } = useResponsive();

  return (
    <Stack
      screenOptions={{
        headerShown: isLargeScreen,
        headerBackVisible: true,
        headerBackButtonDisplayMode: 'minimal',
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="user-profile/[handle]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="user-profile/[handle]/post/[rkey]"
        options={{
          title: 'Post',
          headerShown: isLargeScreen,
          headerBackVisible: true,
        }}
      />
    </Stack>
  );
}
