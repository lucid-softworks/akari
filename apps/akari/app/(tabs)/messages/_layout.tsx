import { Stack } from 'expo-router';

import { CommonStackScreens } from '../commonScreens';

export default function MessagesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="pending" />
      <Stack.Screen name="[handle]" />
      <CommonStackScreens />
    </Stack>
  );
}
