import { Stack } from 'expo-router';
import { useMemo } from 'react';
import type { ReactElement } from 'react';

type LayoutProps = {
  segment: string;
};

const rootScreens: Record<string, ReactElement | null> = {
  '(index)': <Stack.Screen name="index" options={{ headerShown: false }} />, 
  '(search)': <Stack.Screen name="search" options={{ headerShown: false }} />, 
  '(notifications)': <Stack.Screen name="notifications" options={{ headerShown: false }} />, 
  '(bookmarks)': <Stack.Screen name="bookmarks" options={{ headerShown: false }} />, 
  '(messages)': <Stack.Screen name="messages" options={{ headerShown: false }} />, 
  '(profile)': <Stack.Screen name="profile" options={{ headerShown: false }} />, 
  '(settings)': <Stack.Screen name="settings" options={{ headerShown: false }} />, 
};

const sharedScreens = ['post', 'profile', 'messages', 'settings'] as const;

export default function SharedTabsLayout({ segment }: LayoutProps) {
  const rootScreen = useMemo(() => rootScreens[segment] ?? null, [segment]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {rootScreen}
      {sharedScreens
        .filter((name) => segment !== `(${name})`)
        .map((name) => (
          <Stack.Screen key={name} name={name} />
        ))}
    </Stack>
  );
}
