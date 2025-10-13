import { Stack } from 'expo-router';

export default function BookmarksLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackVisible: true,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="user-profile/[handle]/post/[rkey]"
        options={{
          title: 'Post',
          headerShown: true,
          headerBackVisible: true,
        }}
      />
    </Stack>
  );
}
