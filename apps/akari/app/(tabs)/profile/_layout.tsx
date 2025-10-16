import { Stack } from 'expo-router';

import { useResponsive } from '@/hooks/useResponsive';

export default function ProfileLayout() {
  const { isLargeScreen } = useResponsive();

  return (
    <Stack
      screenOptions={{
        headerShown: isLargeScreen,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[handle]" options={{ headerShown: false }} />
      <Stack.Screen
        name="[handle]/post/[rkey]"
        options={{
          title: 'Post',
          headerShown: isLargeScreen,
          headerBackVisible: true,
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
    </Stack>
  );
}
