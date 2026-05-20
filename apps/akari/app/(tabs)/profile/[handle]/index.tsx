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
      {/* key={handle} forces a fresh ProfileView when the route param
          changes. Without it, expo-router's `dangerouslySingular`
          stack reuses the same [handle]/index instance across
          profile-to-profile navigations, and on back from a child
          route the inner hooks have been seen to read stale params,
          rendering the previously-mounted user's profile. */}
      <ProfileView key={handle} handle={handle} />
    </>
  );
}
