import { Stack } from 'expo-router';

import PostScreen from '../post/[id]';
import ProfileHandleScreen from '../profile/[handle]';

export default function BookmarksLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="post/[id]" getComponent={() => PostScreen} />
      <Stack.Screen name="profile/[handle]" getComponent={() => ProfileHandleScreen} />
    </Stack>
  );
}
