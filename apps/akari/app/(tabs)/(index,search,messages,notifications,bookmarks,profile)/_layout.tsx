import React from 'react';
import { Stack } from 'expo-router';

const ROOT_ROUTES = ['index', 'search', 'messages', 'notifications', 'bookmarks', 'profile'] as const;

const ROOT_SCREEN_OPTIONS = { headerShown: false } as const;

type SharedTabStackLayoutProps = {
  segment: string | null;
};

function renderRootScreen(segment: SharedTabStackLayoutProps['segment']) {
  if (segment && ROOT_ROUTES.includes(segment as (typeof ROOT_ROUTES)[number])) {
    return <Stack.Screen name={segment} options={ROOT_SCREEN_OPTIONS} />;
  }

  return null;
}

export default function SharedTabStackLayout({ segment }: SharedTabStackLayoutProps) {
  return (
    <Stack>
      {renderRootScreen(segment)}
      <Stack.Screen name="post/[id]" />
      <Stack.Screen name="profile/[handle]" options={ROOT_SCREEN_OPTIONS} />
    </Stack>
  );
}
