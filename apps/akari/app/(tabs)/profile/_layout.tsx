import { Stack } from 'expo-router';
import { Platform } from 'react-native';

// Web uses the sidebar layout (see (tabs)/_layout.tsx) and provides its own
// in-page navigation, so a Stack header on top of that is just a duplicate
// row. On native we keep the header for the iOS back-swipe affordance and
// the Android back arrow.
const SHOW_STACK_HEADER = Platform.OS !== 'web';

export default function ProfileLayout() {
  // Default the entire stack to "no header on web". The per-screen
  // entries only re-enable the header by *not* overriding this on
  // native, where they want titles + the back button. We don't pass
  // `headerShown: SHOW_STACK_HEADER` per-screen because a previous
  // setup using function-form options + `dangerouslySingular` ended up
  // ignoring the headerShown override on web — the title still
  // applied but the header rendered. Putting the toggle on the Stack
  // screenOptions sidesteps that.
  return (
    <Stack
      screenOptions={{
        headerShown: SHOW_STACK_HEADER,
        gestureEnabled: true,
        headerBackVisible: true,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="[handle]/index"
        options={({ route }) => ({
          headerTitle: `@${(route.params as { handle?: string })?.handle ?? ''}`,
        })}
        dangerouslySingular
      />
      <Stack.Screen
        name="[handle]/post/[rkey]"
        options={{ title: 'Post' }}
        dangerouslySingular
      />
      <Stack.Screen
        name="[handle]/feed/[rkey]"
        options={{ title: 'Feed' }}
        dangerouslySingular
      />
    </Stack>
  );
}
