import { Stack } from "expo-router";

export default function MessagesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="pending" />
      <Stack.Screen name="[handle]" />
      <Stack.Screen name="post/[id]" />
    </Stack>
  );
}
