import { Stack } from 'expo-router';

import { TabBackButton } from '@/components/TabBackButton';

export default function ProfilePostLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackButtonDisplayMode: 'minimal',
        headerLeft: () => <TabBackButton />,
      }}
    >
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
