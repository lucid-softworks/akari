import React from 'react';
import { Stack } from 'expo-router';

const ROOT_ROUTES = [
  'index',
  'search',
  'messages',
  'notifications',
  'bookmarks',
  'profile',
] as const;

const ROOT_SCREEN_OPTIONS = { headerShown: false } as const;

export default function SharedTabStackLayout() {
  return (
    <Stack>
      {ROOT_ROUTES.map((route) => (
        <Stack.Screen key={route} name={route} options={ROOT_SCREEN_OPTIONS} />
      ))}
      <Stack.Screen name="post/[id]" />
      <Stack.Screen name="profile/[handle]" options={ROOT_SCREEN_OPTIONS} />
    </Stack>
  );
}
