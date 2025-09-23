import React from 'react';
import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

export default function SettingsLayout() {
  const { t } = useTranslation();
  const headerBackground = useThemeColor({}, 'background');
  const headerTint = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: headerBackground,
          borderBottomColor: borderColor,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
        headerTintColor: headerTint,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
        headerBackTitleVisible: false,
        contentStyle: { backgroundColor: headerBackground },
      }}
    >
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
    </Stack>
  );
}

