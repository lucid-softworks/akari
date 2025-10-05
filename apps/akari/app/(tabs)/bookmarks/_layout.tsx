import { Stack } from 'expo-router';

import { CommonStackScreens } from '../commonScreens';

export default function BookmarksTabLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <CommonStackScreens />
    </Stack>
  );
}
