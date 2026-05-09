import { Redirect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { SettingsSection } from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import {
  activeOpacity,
  fontSize,
  fontWeight,
  layout,
  radius,
  spacing,
} from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useDeactivateAccount } from '@/hooks/mutations/useDeactivateAccount';
import { useWipeAllData } from '@/hooks/mutations/useWipeAllData';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useConfirm } from '@/hooks/useConfirm';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

export default function DeactivateAccountScreen() {
  const borderColor = useBorderColor();
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const dangerColor = useThemeColor({ light: '#DC2626', dark: '#F87171' }, 'text');
  const { t } = useTranslation();
  const { showToast } = useToast();
  const confirm = useConfirm();

  const deactivate = useDeactivateAccount();
  const wipeAllData = useWipeAllData();
  const [signedOut, setSignedOut] = useState(false);

  const handlePress = useCallback(() => {
    confirm({
      title: t('settings.deactivateAccount'),
      message: t('settings.deactivateAccountConfirm'),
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.deactivateAccountAction'),
          style: 'destructive',
          onPress: () => {
            deactivate.mutate(undefined, {
              onSuccess: async () => {
                // Once the account is deactivated, the existing access
                // tokens are gone — wipe local state and bounce back to
                // the sign-in screen so we don't render auth-required
                // queries against an account that no longer accepts them.
                try {
                  await wipeAllData.mutateAsync();
                } catch {
                  // best-effort — even if the wipe failed, the redirect
                  // forces the user out of authed UI.
                }
                setSignedOut(true);
              },
              onError: () => {
                showToast({ type: 'error', message: t('settings.deactivateAccountFailed') });
              },
            });
          },
        },
      ],
    });
  }, [confirm, deactivate, showToast, t, wipeAllData]);

  if (signedOut) return <Redirect href="/(auth)/signin" />;

  const isPending = deactivate.isPending;

  return (
    <SettingsSubpageLayout title={t('settings.deactivateAccount')}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <ThemedView style={[styles.introCard, { borderColor }]}>
          <ThemedText style={[styles.introText, { color: subduedColor }]}>
            {t('settings.deactivateAccountIntro')}
          </ThemedText>
        </ThemedView>

        <SettingsSection>
          <Pressable
            onPress={handlePress}
            disabled={isPending}
            style={({ pressed }) => [
              styles.dangerButton,
              { borderColor: dangerColor },
              pressed && { opacity: activeOpacity.default },
              isPending && styles.disabled,
            ]}
            accessibilityRole="button"
          >
            <View style={styles.actionRow}>
              <IconSymbol name="moon.zzz.fill" size={18} color={dangerColor} />
              <ThemedText style={[styles.dangerText, { color: dangerColor }]}>
                {t('settings.deactivateAccountAction')}
              </ThemedText>
            </View>
          </Pressable>
        </SettingsSection>
      </ScrollView>
    </SettingsSubpageLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  contentContainer: { paddingBottom: spacing.xxl },
  introCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderWidth: layout.hairline,
  },
  introText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  dangerButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: layout.hairline,
    borderRadius: radius.xl,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dangerText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  disabled: {
    opacity: 0.5,
  },
});
