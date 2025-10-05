import { Stack } from 'expo-router';

export default function SharedProfileLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="[handle]"
        options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal', title: '' }}
      />
    </Stack>
  );
}
