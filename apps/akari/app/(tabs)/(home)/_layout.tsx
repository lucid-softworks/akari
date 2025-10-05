import { Stack } from 'expo-router';

export default function HomeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="bookmarks" />
      <Stack.Screen name="users/[username]" />
      <Stack.Screen name="posts/[postId]" />
    </Stack>
  );
}
