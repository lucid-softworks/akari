import React, { useMemo } from 'react';
import { Stack, useSegments } from 'expo-router';

const ROOT_ROUTES = ['index', 'search', 'messages', 'notifications', 'profile'] as const;

type RootRoute = (typeof ROOT_ROUTES)[number];

const ROOT_ROUTE_SET = new Set<RootRoute>(ROOT_ROUTES);

const ROOT_SCREEN_OPTIONS = { headerShown: false } as const;

export default function SharedTabStackLayout() {
  const segments = useSegments();

  const activeRoot = useMemo<RootRoute>(() => {
    for (let index = segments.length - 1; index >= 0; index -= 1) {
      const segment = segments[index];

      if (ROOT_ROUTE_SET.has(segment as RootRoute)) {
        return segment as RootRoute;
      }
    }

    return 'index';
  }, [segments]);

  return (
    <Stack>
      <Stack.Screen name={activeRoot} options={ROOT_SCREEN_OPTIONS} />
      <Stack.Screen name="post/[id]" />
      <Stack.Screen name="profile/[handle]" options={ROOT_SCREEN_OPTIONS} />
    </Stack>
  );
}
