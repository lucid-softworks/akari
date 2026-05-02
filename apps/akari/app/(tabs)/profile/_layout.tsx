import { Stack } from 'expo-router';

import { useResponsive } from '@/hooks/useResponsive';

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
        name="[handle]"
        options={({ route }) => ({
          headerShown: true,
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
          headerShown: true,
          headerBackVisible: true,
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
    </Stack>
  );
}
