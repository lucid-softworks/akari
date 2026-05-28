import React from 'react';
import { Stack } from 'expo-router';

import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

export default function SettingsLayout() {
  const { t } = useTranslation();
  const headerBackground = useThemeColor({}, 'background');

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: headerBackground },
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="account" options={{ title: t('settings.account') }} />
      <Stack.Screen name="handle" options={{ title: t('settings.handle') }} />
      <Stack.Screen
        name="update-email"
        options={{ title: t('settings.updateEmail') }}
      />
      <Stack.Screen
        name="password"
        options={{ title: t('settings.password') }}
      />
      <Stack.Screen
        name="birthday"
        options={{ title: t('settings.birthday') }}
      />
      <Stack.Screen
        name="automation-label"
        options={{ title: t('settings.automationLabel') }}
      />
      <Stack.Screen
        name="export-data"
        options={{ title: t('settings.exportData') }}
      />
      <Stack.Screen
        name="deactivate-account"
        options={{ title: t('settings.deactivateAccount') }}
      />
      <Stack.Screen
        name="delete-account"
        options={{ title: t('settings.deleteAccount') }}
      />
      <Stack.Screen
        name="privacy-and-security"
        options={{ title: t('settings.privacyAndSecurity') }}
      />
      <Stack.Screen
        name="app-passwords"
        options={{ title: t('settings.appPasswords') }}
      />
      <Stack.Screen name="moderation" options={{ title: t('settings.moderation') }} />
      <Stack.Screen
        name="moderation-lists"
        options={{ title: t('settings.moderationLists') }}
      />
      <Stack.Screen
        name="moderation-services"
        options={{ title: t('settings.moderationServices') }}
      />
      <Stack.Screen
        name="muted-words"
        options={{ title: t('settings.mutedWordsTags') }}
      />
      <Stack.Screen
        name="muted-accounts"
        options={{ title: t('settings.mutedAccounts') }}
      />
      <Stack.Screen
        name="blocked-accounts"
        options={{ title: t('settings.blockedAccounts') }}
      />
      <Stack.Screen
        name="interaction"
        options={{ title: t('settings.interactionSettings') }}
      />
      <Stack.Screen
        name="verification"
        options={{ title: t('settings.verificationSettings') }}
      />
      <Stack.Screen
        name="notifications"
        options={{ title: t('settings.notifications') }}
      />
      <Stack.Screen
        name="notification-category"
        options={{ title: t('settings.notifications') }}
      />
      <Stack.Screen
        name="content-and-media"
        options={{ title: t('settings.contentAndMedia') }}
      />
      <Stack.Screen
        name="external-media"
        options={{ title: t('settings.externalMedia') }}
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
      <Stack.Screen
        name="content-languages"
        options={{ title: t('settings.contentLanguages') }}
      />
      <Stack.Screen
        name="your-interests"
        options={{ title: t('settings.yourInterests') }}
      />
      <Stack.Screen
        name="thread-preferences"
        options={{ title: t('settings.threadPreferences') }}
      />
      <Stack.Screen
        name="following-cleanup"
        options={{ title: t('settings.followingCleanup.title') }}
      />
      <Stack.Screen name="about" options={{ title: t('settings.about') }} />
      <Stack.Screen name="add-account" options={{ title: t('common.addAccount') }} />
      <Stack.Screen name="customize-tabs" options={{ title: t('settings.customizeTabs') }} />
      <Stack.Screen name="development" options={{ title: t('settings.development') }} />
      <Stack.Screen name="appearance-light" options={{ title: 'Light Mode Colors' }} />
      <Stack.Screen name="appearance-dark" options={{ title: 'Dark Mode Colors' }} />
    </Stack>
  );
}

