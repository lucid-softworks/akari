import { Stack } from 'expo-router';
import { Platform } from 'react-native';

const SHOW_STACK_HEADER = Platform.OS !== 'web';

export default function CommunityNotesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: SHOW_STACK_HEADER,
        gestureEnabled: true,
        headerBackVisible: true,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Community Notes' }} />
    </Stack>
  );
}
