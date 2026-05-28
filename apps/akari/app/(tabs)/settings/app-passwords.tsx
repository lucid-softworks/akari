import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { SettingsSection } from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { SettingsScroll } from '@/components/settings/SettingsScroll';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import {
  activeOpacity,
  fontSize,
  fontWeight,
  hitSlop,
  layout,
  radius,
  spacing,
} from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useCreateAppPassword } from '@/hooks/mutations/useCreateAppPassword';
import { useRevokeAppPassword } from '@/hooks/mutations/useRevokeAppPassword';
import { useAppPasswords } from '@/hooks/queries/useAppPasswords';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export default function AppPasswordsScreen() {
  const borderColor = useBorderColor();
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const textColor = useThemeColor({}, 'text');
  const inputBackground = useThemeColor({ light: '#F3F4F6', dark: '#1F2937' }, 'background');
  const dangerColor = useThemeColor({ light: '#DC2626', dark: '#F87171' }, 'text');
  const { t, currentLocale } = useTranslation();
  const { showToast } = useToast();

  const passwords = useAppPasswords();
  const createMutation = useCreateAppPassword();
  const revokeMutation = useRevokeAppPassword();

  const [draftName, setDraftName] = useState('');
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = useCallback(() => {
    const name = draftName.trim();
    if (!name) return;
    createMutation.mutate(
      { name },
      {
        onSuccess: (res) => {
          setCreatedPassword(res.password);
          setDraftName('');
          setCopied(false);
        },
        onError: () => {
          showToast({ type: 'error', message: t('settings.appPasswordsCreateFailed') });
        },
      },
    );
  }, [createMutation, draftName, showToast, t]);

  const handleRevoke = useCallback(
    (name: string) => {
      revokeMutation.mutate(name, {
        onError: () => {
          showToast({ type: 'error', message: t('settings.appPasswordsRevokeFailed') });
        },
      });
    },
    [revokeMutation, showToast, t],
  );

  const handleCopy = useCallback(async () => {
    if (!createdPassword) return;
    await Clipboard.setStringAsync(createdPassword);
    setCopied(true);
    showToast({ type: 'success', message: t('common.copiedToClipboard') });
  }, [createdPassword, showToast, t]);

  const items = passwords.data ?? [];

  return (
    <SettingsSubpageLayout title={t('settings.appPasswords')}>
      <SettingsScroll
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <ThemedView style={[styles.introCard, { borderColor }]}>
          <ThemedText style={[styles.introText, { color: subduedColor }]}>
            {t('settings.appPasswordsIntro')}
          </ThemedText>
        </ThemedView>

        {createdPassword ? (
          <ThemedView style={[styles.createdCard, { borderColor: accentColor }]}>
            <ThemedText style={[styles.createdHeading, { color: accentColor }]}>
              {t('settings.appPasswordsCreatedHeading')}
            </ThemedText>
            <ThemedText style={[styles.createdNotice, { color: subduedColor }]}>
              {t('settings.appPasswordsCreatedNotice')}
            </ThemedText>
            <View style={[styles.passwordBox, { borderColor }]}>
              <ThemedText style={[styles.passwordText, { color: textColor }]} selectable>
                {createdPassword}
              </ThemedText>
              <Pressable
                onPress={handleCopy}
                accessibilityRole="button"
                accessibilityLabel={t('settings.appPasswordsCopy')}
                hitSlop={hitSlop}
                style={({ pressed }) => [
                  styles.copyButton,
                  { borderColor: accentColor },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <ThemedText style={[styles.copyButtonText, { color: accentColor }]}>
                  {copied ? t('settings.appPasswordsCopied') : t('settings.appPasswordsCopy')}
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        ) : null}

        <SettingsSection>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <View style={styles.formRow}>
              <TextInput
                value={draftName}
                onChangeText={setDraftName}
                placeholder={t('settings.appPasswordsCreateNamePlaceholder')}
                placeholderTextColor={subduedColor}
                style={[styles.input, { backgroundColor: inputBackground, color: textColor }]}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleCreate}
              />
              <Pressable
                onPress={handleCreate}
                disabled={createMutation.isPending || !draftName.trim()}
                style={({ pressed }) => [
                  styles.createButton,
                  { backgroundColor: accentColor },
                  pressed && { opacity: activeOpacity.default },
                  (createMutation.isPending || !draftName.trim()) && styles.disabled,
                ]}
                accessibilityRole="button"
              >
                <ThemedText style={styles.createButtonText}>
                  {t('settings.appPasswordsCreate')}
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </SettingsSection>

        <SettingsSection>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            {passwords.isLoading ? (
              <View style={styles.emptyState}>
                <ThemedText style={[styles.emptyText, { color: subduedColor }]}>
                  {t('common.loading')}
                </ThemedText>
              </View>
            ) : items.length === 0 ? (
              <View style={styles.emptyState}>
                <ThemedText style={[styles.emptyText, { color: subduedColor }]}>
                  {t('settings.appPasswordsEmpty')}
                </ThemedText>
              </View>
            ) : (
              items.map((entry, index) => (
                <View
                  key={entry.name}
                  style={[
                    styles.row,
                    index < items.length - 1 && {
                      borderBottomColor: borderColor,
                      borderBottomWidth: layout.hairline,
                    },
                  ]}
                >
                  <View style={styles.rowText}>
                    <View style={styles.rowNameRow}>
                      <ThemedText style={[styles.rowName, { color: textColor }]} numberOfLines={1}>
                        {entry.name}
                      </ThemedText>
                      {entry.privileged ? (
                        <View style={[styles.badge, { borderColor: accentColor }]}>
                          <ThemedText style={[styles.badgeText, { color: accentColor }]}>
                            {t('settings.appPasswordsPrivileged')}
                          </ThemedText>
                        </View>
                      ) : null}
                    </View>
                    <ThemedText style={[styles.rowMeta, { color: subduedColor }]}>
                      {t('settings.appPasswordsCreatedAt', {
                        when: formatDate(entry.createdAt, currentLocale),
                      })}
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={() => handleRevoke(entry.name)}
                    disabled={revokeMutation.isPending}
                    accessibilityRole="button"
                    accessibilityLabel={t('settings.appPasswordsRevoke')}
                    hitSlop={hitSlop}
                    style={({ pressed }) => [
                      styles.revokeButton,
                      { borderColor: dangerColor },
                      pressed && { opacity: 0.7 },
                      revokeMutation.isPending && styles.disabled,
                    ]}
                  >
                    <IconSymbol name="trash.fill" size={14} color={dangerColor} />
                    <ThemedText style={[styles.revokeButtonText, { color: dangerColor }]}>
                      {t('settings.appPasswordsRevoke')}
                    </ThemedText>
                  </Pressable>
                </View>
              ))
            )}
          </ThemedView>
        </SettingsSection>
      </SettingsScroll>
    </SettingsSubpageLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  contentContainer: { paddingBottom: spacing.xxl },
  introCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderWidth: layout.hairline,
  },
  introText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  createdCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderRadius: radius.sm,
    gap: spacing.sm,
  },
  createdHeading: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  createdNotice: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  passwordBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderWidth: layout.hairline,
    borderRadius: radius.xs,
  },
  passwordText: {
    flex: 1,
    fontFamily: 'Courier',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  copyButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: layout.hairline,
    borderRadius: radius.xl,
  },
  copyButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  sectionCard: {
    marginHorizontal: spacing.lg,
    borderWidth: layout.hairline,
    backgroundColor: 'transparent',
  },
  formRow: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  input: {
    fontSize: fontSize.base,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.xs,
  },
  createButton: {
    paddingVertical: spacing.sm,
    borderRadius: radius.xs,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  emptyState: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.base,
    textAlign: 'center',
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rowText: { flex: 1 },
  rowNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  badge: {
    borderWidth: layout.hairline,
    borderRadius: radius.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  rowMeta: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  revokeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: layout.hairline,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  revokeButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  disabled: {
    opacity: 0.5,
  },
});
