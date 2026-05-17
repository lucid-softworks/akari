import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { SettingsSection } from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { activeOpacity, fontSize, fontWeight, radius, spacing } from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useUpdatePostInteractionSettings } from '@/hooks/mutations/useUpdatePostInteractionSettings';
import { usePostInteractionSettings } from '@/hooks/queries/usePostInteractionSettings';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type ReplyMode = 'anyone' | 'nobody';

export default function InteractionSettingsScreen() {
  const borderColor = useBorderColor();
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const checkboxBorder = useThemeColor({ light: '#D1D5DB', dark: '#3A3A3C' }, 'text');
  const { t } = useTranslation();
  const { showToast } = useToast();

  const settings = usePostInteractionSettings();
  const update = useUpdatePostInteractionSettings();

  type FormState = {
    mode: ReplyMode;
    allowFollowers: boolean;
    allowFollowing: boolean;
    allowMentioned: boolean;
    allowQuotes: boolean;
  };

  // Pre-fill once preferences land. This effect only seeds the form
  // from server state; subsequent local edits stick around until Save.
  // We hold all five form fields in a single state bag so the seed
  // happens in one render rather than cascading per-field.
  const [form, setForm] = useState<FormState>(() => ({
    mode: settings.data.mode,
    allowFollowers: settings.data.followers,
    allowFollowing: settings.data.following,
    allowMentioned: settings.data.mentioned,
    allowQuotes: settings.data.allowQuotes,
  }));
  const { mode, allowFollowers, allowFollowing, allowMentioned, allowQuotes } = form;
  const setMode = useCallback((mode: ReplyMode) => setForm((p) => ({ ...p, mode })), []);
  const setAllowFollowers = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) =>
      setForm((p) => ({
        ...p,
        allowFollowers: typeof next === 'function' ? next(p.allowFollowers) : next,
      })),
    [],
  );
  const setAllowFollowing = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) =>
      setForm((p) => ({
        ...p,
        allowFollowing: typeof next === 'function' ? next(p.allowFollowing) : next,
      })),
    [],
  );
  const setAllowMentioned = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) =>
      setForm((p) => ({
        ...p,
        allowMentioned: typeof next === 'function' ? next(p.allowMentioned) : next,
      })),
    [],
  );
  const setAllowQuotes = useCallback(
    (next: boolean) => setForm((p) => ({ ...p, allowQuotes: next })),
    [],
  );

  useEffect(() => {
    setForm({
      mode: settings.data.mode,
      allowFollowers: settings.data.followers,
      allowFollowing: settings.data.following,
      allowMentioned: settings.data.mentioned,
      allowQuotes: settings.data.allowQuotes,
    });
  }, [settings.data]);

  const handleSave = useCallback(() => {
    update.mutate(
      {
        mode,
        followers: allowFollowers,
        following: allowFollowing,
        mentioned: allowMentioned,
        allowQuotes,
      },
      {
        onSuccess: () => router.back(),
        onError: () => {
          showToast({ type: 'error', message: t('settings.notificationSaveFailed') });
        },
      },
    );
  }, [allowFollowers, allowFollowing, allowMentioned, allowQuotes, mode, showToast, t, update]);

  const restrictionsDisabled = mode === 'nobody';

  return (
    <SettingsSubpageLayout title={t('settings.interactionSettings')}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <ThemedView style={[styles.introCard, { borderColor }]}>
          <ThemedText style={[styles.introText, { color: subduedColor }]}>
            {t('settings.interactionSettingsIntro')}
          </ThemedText>
        </ThemedView>

        <SettingsSection title={t('settings.whoCanReply')}>
          <View style={styles.modeRow}>
            <ModeButton
              active={mode === 'anyone'}
              accentColor={accentColor}
              borderColor={borderColor}
              icon="circle"
              activeIcon="largecircle.fill.circle"
              label={t('settings.whoCanReplyAnyone')}
              onPress={() => setMode('anyone')}
            />
            <ModeButton
              active={mode === 'nobody'}
              accentColor={accentColor}
              borderColor={borderColor}
              icon="circle"
              activeIcon="largecircle.fill.circle"
              label={t('settings.whoCanReplyNobody')}
              onPress={() => setMode('nobody')}
            />
          </View>

          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <CheckboxRow
              accentColor={accentColor}
              borderColor={borderColor}
              checkboxBorder={checkboxBorder}
              disabled={restrictionsDisabled}
              label={t('settings.whoCanReplyFollowers')}
              onToggle={() => setAllowFollowers((v) => !v)}
              showDivider
              value={!restrictionsDisabled && allowFollowers}
            />
            <CheckboxRow
              accentColor={accentColor}
              borderColor={borderColor}
              checkboxBorder={checkboxBorder}
              disabled={restrictionsDisabled}
              label={t('settings.whoCanReplyFollowing')}
              onToggle={() => setAllowFollowing((v) => !v)}
              showDivider
              value={!restrictionsDisabled && allowFollowing}
            />
            <CheckboxRow
              accentColor={accentColor}
              borderColor={borderColor}
              checkboxBorder={checkboxBorder}
              disabled={restrictionsDisabled}
              label={t('settings.whoCanReplyMentioned')}
              onToggle={() => setAllowMentioned((v) => !v)}
              showDivider
              value={!restrictionsDisabled && allowMentioned}
            />
            <Pressable
              disabled={restrictionsDisabled}
              onPress={() => showToast({ type: 'info', message: t('settings.notImplemented') })}
              style={({ pressed }) => [
                styles.listsRow,
                restrictionsDisabled && styles.disabled,
                pressed && !restrictionsDisabled && { opacity: activeOpacity.default },
              ]}
            >
              <ThemedText style={styles.listsLabel}>
                {t('settings.whoCanReplyLists')}
              </ThemedText>
              <IconSymbol name="chevron.down" size={16} color={subduedColor} />
            </Pressable>
          </ThemedView>
        </SettingsSection>

        <SettingsSection>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <View style={styles.toggleRow}>
              <IconSymbol name="quote.bubble.fill" size={20} color={accentColor} style={styles.toggleIcon} />
              <ThemedText style={styles.toggleLabel}>{t('settings.allowQuotePosts')}</ThemedText>
              <Switch value={allowQuotes} onValueChange={setAllowQuotes} />
            </View>
          </ThemedView>
        </SettingsSection>

        <Pressable
          onPress={handleSave}
          disabled={update.isPending}
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: accentColor },
            pressed && { opacity: activeOpacity.default },
            update.isPending && styles.disabled,
          ]}
          accessibilityRole="button"
        >
          <ThemedText style={styles.saveButtonText}>{t('common.save')}</ThemedText>
        </Pressable>
      </ScrollView>
    </SettingsSubpageLayout>
  );
}

type ModeButtonProps = {
  active: boolean;
  accentColor: string;
  borderColor: string;
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  activeIcon: React.ComponentProps<typeof IconSymbol>['name'];
  label: string;
  onPress: () => void;
};

function ModeButton({ active, accentColor, borderColor, icon, activeIcon, label, onPress }: ModeButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeButton,
        {
          borderColor: active ? accentColor : borderColor,
          backgroundColor: active ? `${accentColor}1A` : 'transparent',
        },
        pressed && { opacity: activeOpacity.default },
      ]}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
    >
      <IconSymbol
        name={active ? activeIcon : icon}
        size={20}
        color={active ? accentColor : borderColor}
      />
      <ThemedText style={[styles.modeLabel, active && { color: accentColor, fontWeight: fontWeight.semibold }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

type CheckboxRowProps = {
  accentColor: string;
  borderColor: string;
  checkboxBorder: string;
  disabled: boolean;
  label: string;
  onToggle: () => void;
  showDivider: boolean;
  value: boolean;
};

function CheckboxRow({ accentColor, borderColor, checkboxBorder, disabled, label, onToggle, showDivider, value }: CheckboxRowProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onToggle}
      style={({ pressed }) => [
        styles.checkboxRow,
        showDivider && { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth },
        disabled && styles.disabled,
        pressed && !disabled && { opacity: activeOpacity.default },
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value, disabled }}
    >
      <View
        style={[
          styles.checkbox,
          {
            borderColor: value ? accentColor : checkboxBorder,
            backgroundColor: value ? accentColor : 'transparent',
          },
        ]}
      >
        {value ? <IconSymbol name="checkmark" size={14} color="#FFFFFF" /> : null}
      </View>
      <ThemedText style={styles.checkboxLabel}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing.xxl,
  },
  introCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  introText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  sectionCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
  },
  modeLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.xs,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  listsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  listsLabel: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  toggleIcon: {
    marginRight: spacing.sm,
  },
  toggleLabel: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  disabled: {
    opacity: 0.5,
  },
  saveButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: radius.xl,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});
