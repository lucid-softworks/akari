import { Stack } from 'expo-router';

export default function NotificationsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="users/[username]" />
      <Stack.Screen name="posts/[postId]" />
    </Stack>
  );
}
