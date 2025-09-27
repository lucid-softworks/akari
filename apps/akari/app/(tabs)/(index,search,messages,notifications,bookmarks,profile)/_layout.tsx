import React from 'react';
import { Stack } from 'expo-router';

type TabSegment = 'index' | 'search' | 'messages' | 'notifications' | 'bookmarks' | 'profile';

type LayoutProps = {
  segment?: string | null;
};

const ROOT_SCREEN_OPTIONS = { headerShown: false } as const;

function renderRootScreen(segment?: string | null) {
  switch (segment as TabSegment | undefined) {
    case 'index':
      return <Stack.Screen name="index" options={ROOT_SCREEN_OPTIONS} />;
    case 'search':
      return <Stack.Screen name="search" options={ROOT_SCREEN_OPTIONS} />;
    case 'messages':
      return <Stack.Screen name="messages" options={ROOT_SCREEN_OPTIONS} />;
    case 'notifications':
      return <Stack.Screen name="notifications" options={ROOT_SCREEN_OPTIONS} />;
    case 'bookmarks':
      return <Stack.Screen name="bookmarks" options={ROOT_SCREEN_OPTIONS} />;
    case 'profile':
      return <Stack.Screen name="profile" options={ROOT_SCREEN_OPTIONS} />;
    default:
      return null;
  }
}

export default function SharedTabStackLayout({ segment }: LayoutProps) {
  return (
    <Stack>
      {renderRootScreen(segment)}
      <Stack.Screen name="post/[id]" />
      <Stack.Screen name="profile/[handle]" options={ROOT_SCREEN_OPTIONS} />
    </Stack>
  );
}
