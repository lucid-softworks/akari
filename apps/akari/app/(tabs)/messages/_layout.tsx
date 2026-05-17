import { Stack } from 'expo-router';

import { useResponsive } from '@/hooks/useResponsive';

export default function MessagesLayout() {
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
      <Stack.Screen name="pending" />
      <Stack.Screen name="new" options={{ headerShown: false }} />
      <Stack.Screen name="[convoId]/index" options={{ headerShown: false }} />
      <Stack.Screen name="[convoId]/settings" options={{ headerShown: false }} />
      <Stack.Screen
        name="user-profile/[handle]"
        options={{
          headerShown: false,
        }}
        dangerouslySingular
      />
      {/* `user-profile/[handle]/_layout.tsx` owns the post-detail screen;
          re-declaring it here triggers "Too many screens defined". */}
    </Stack>
  );
}
