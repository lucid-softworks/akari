import { Stack } from 'expo-router';

import { useResponsive } from '@/hooks/useResponsive';

export default function UserProfileLayout() {
  const { isLargeScreen } = useResponsive();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="post/[rkey]"
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
