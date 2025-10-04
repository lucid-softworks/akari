import React from 'react';
import { Stack } from 'expo-router';

import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import PostScreen from '../post/[id]';
import ProfileHandleScreen from '../profile/[handle]';

export default function SettingsLayout() {
  const { t } = useTranslation();
  const headerBackground = useThemeColor({}, 'background');

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: headerBackground },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="account" options={{ title: t('settings.account') }} />
      <Stack.Screen
        name="privacy-and-security"
        options={{ title: t('settings.privacyAndSecurity') }}
      />
      <Stack.Screen name="moderation" options={{ title: t('settings.moderation') }} />
      <Stack.Screen
        name="notifications"
        options={{ title: t('settings.notifications') }}
      />
      <Stack.Screen
        name="content-and-media"
        options={{ title: t('settings.contentAndMedia') }}
      />
      <Stack.Screen
        name="appearance"
        options={{ title: t('settings.appearance') }}
      />
      <Stack.Screen
        name="accessibility"
        options={{ title: t('settings.accessibility') }}
      />
      <Stack.Screen name="languages" options={{ title: t('settings.language') }} />
      <Stack.Screen name="about" options={{ title: t('settings.about') }} />
      <Stack.Screen name="development" options={{ title: t('settings.development') }} />
      <Stack.Screen name="post/[id]" getComponent={() => PostScreen} />
      <Stack.Screen name="profile/[handle]" getComponent={() => ProfileHandleScreen} />
    </Stack>
  );
}

