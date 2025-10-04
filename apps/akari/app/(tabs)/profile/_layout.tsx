import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="[handle]"
        options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal', title: '' }}
      />
    </Stack>
  );
}
