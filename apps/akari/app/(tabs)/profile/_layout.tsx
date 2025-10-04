import { Stack } from 'expo-router';

import PostScreen from '../post/[id]';
import ProfileHandleScreen from '../profile/[handle]';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[handle]" />
      <Stack.Screen name="post/[id]" getComponent={() => PostScreen} />
      <Stack.Screen name="profile/[handle]" getComponent={() => ProfileHandleScreen} />
    </Stack>
  );
}
