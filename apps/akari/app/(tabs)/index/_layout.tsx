import { Stack } from 'expo-router';

export default function IndexTabLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="post/[id]" />
    </Stack>
  );
}
