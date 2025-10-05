import { Stack } from 'expo-router';

export function CommonStackScreens() {
  return (
    <>
      <Stack.Screen name="post/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="profile/[handle]" options={{ headerShown: false }} />
    </>
  );
}
