import { Stack, useLocalSearchParams } from 'expo-router';

import ProfileView from '@/components/ProfileView';

export default function ProfileScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();

  if (!handle) {
    return null;
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackVisible: true,
          headerBackButtonDisplayMode: 'minimal',
          headerTitle: `@${handle}`,
        }}
      />
      <ProfileView handle={handle} />
    </>
  );
}
