import { Stack, useLocalSearchParams } from 'expo-router';
import { Platform } from 'react-native';

import ProfileView from '@/components/ProfileView';

export default function ProfileScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();

  if (!handle) {
    return null;
  }

  // Web uses the sidebar layout's own nav so a Stack header on top of
  // the profile is just a duplicate row. Native keeps the header for
  // the back-swipe / Android back-arrow affordance.
  const showStackHeader = Platform.OS !== 'web';

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: showStackHeader,
          headerBackVisible: true,
          headerBackButtonDisplayMode: 'minimal',
          headerTitle: `@${handle}`,
        }}
      />
      <ProfileView handle={handle} />
    </>
  );
}
