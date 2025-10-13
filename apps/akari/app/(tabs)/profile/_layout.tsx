import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[handle]" />
      <Stack.Screen
        name="[handle]/post/[rkey]"
        options={{
          title: 'Post',
          headerShown: true,
          headerBackVisible: true,
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
    </Stack>
  );
}
