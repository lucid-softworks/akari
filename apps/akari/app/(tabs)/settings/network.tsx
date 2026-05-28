import React, { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';

import { AppViewEnabledSection } from '@/components/settings/network/AppViewEnabledSection';
import {
  SettingsRow,
  SettingsSection,
} from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { SettingsScroll } from '@/components/settings/SettingsScroll';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, fontSize, fontWeight, radius, layout } from '@/constants/tokens';
import { useUpdateAccountAppView } from '@/hooks/mutations/useUpdateAccountAppView';
import { useAccounts } from '@/hooks/queries/useAccounts';
import { useAccountProfiles } from '@/hooks/queries/useAccountProfiles';
import { useAppViewSettings } from '@/hooks/useAppViewSettings';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import type { Account } from '@/types/account';
import {
  APP_VIEW_PRESETS,
  type AccountAppViewOverride,
  type AppViewPresetId,
  type CdnPresetId,
  isAppViewEnabled,
  resolveAccountAppView,
  resolveAppView,
  resolveCdnHost,
} from '@/utils/appView';

type AccountPickValue = AppViewPresetId | 'default';

export default function NetworkSettingsScreen() {
  const { t } = useTranslation();
  const borderColor = useBorderColor();
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const secondaryText = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const inputBackground = useThemeColor({ light: '#F3F4F6', dark: '#1F2937' }, 'background');
  const inputText = useThemeColor({}, 'text');

  const {
    config,
    setPreset,
    setCustomUrl,
    setCustomDid,
    setCdnPreset,
    setCustomCdnUrl,
    setAppViewEnabled,
  } = useAppViewSettings();
  const appViewEnabled = isAppViewEnabled(config);
  const warningBackground = useThemeColor({ light: '#FEF3C7', dark: '#3F2F0B' }, 'background');
  const warningBorder = useThemeColor({ light: '#F59E0B', dark: '#92500A' }, 'background');
  const warningText = useThemeColor({ light: '#7C2D12', dark: '#FCD34D' }, 'text');
  const { data: accounts = [] } = useAccounts();
  const { data: accountProfiles } = useAccountProfiles();
  const updateAccountAppView = useUpdateAccountAppView();

  const [customUrlDraft, setCustomUrlDraft] = useState(config.customUrl ?? '');
  const [customDidDraft, setCustomDidDraft] = useState(config.customDid ?? '');
  const [customCdnDraft, setCustomCdnDraft] = useState(config.customCdnUrl ?? '');

  const appViewPresets = useMemo<{ id: AppViewPresetId; label: string; description: string }[]>(
    () => [
      {
        id: 'bsky',
        label: t('settings.appView.preset.bsky.label'),
        description: t('settings.appView.preset.bsky.description'),
      },
      {
        id: 'blacksky',
        label: t('settings.appView.preset.blacksky.label'),
        description: t('settings.appView.preset.blacksky.description'),
      },
      {
        id: 'custom',
        label: t('settings.appView.preset.custom.label'),
        description: t('settings.appView.preset.custom.description'),
      },
    ],
    [t],
  );

  const cdnPresets = useMemo<{ id: CdnPresetId; label: string; description: string }[]>(
    () => [
      {
        id: 'bsky',
        label: t('settings.cdn.preset.bsky.label'),
        description: t('settings.cdn.preset.bsky.description'),
      },
      {
        id: 'blueat',
        label: t('settings.cdn.preset.blueat.label'),
        description: t('settings.cdn.preset.blueat.description'),
      },
      {
        id: 'custom',
        label: t('settings.cdn.preset.custom.label'),
        description: t('settings.cdn.preset.custom.description'),
      },
    ],
    [t],
  );

  const handleCustomUrlBlur = useCallback(() => {
    setCustomUrl(customUrlDraft.trim() || undefined);
  }, [customUrlDraft, setCustomUrl]);

  const handleCustomDidBlur = useCallback(() => {
    setCustomDid(customDidDraft.trim() || undefined);
  }, [customDidDraft, setCustomDid]);

  const handleCustomCdnBlur = useCallback(() => {
    setCustomCdnUrl(customCdnDraft.trim() || undefined);
  }, [customCdnDraft, setCustomCdnUrl]);

  const handlePerAccountChange = useCallback(
    (account: Account, choice: AccountPickValue) => {
      const override: AccountAppViewOverride | undefined =
        choice === 'default' ? undefined : { preset: choice };
      updateAccountAppView.mutate({ did: account.did, override });
    },
    [updateAccountAppView],
  );

  const resolvedAppView = resolveAppView(config);
  const resolvedCdnHost = resolveCdnHost(config);

  return (
    <SettingsSubpageLayout title={t('settings.network.title')}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <SettingsScroll
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.flex}
        >
          <ThemedText style={[styles.intro, { color: secondaryText }]}>
            {t('settings.network.intro')}
          </ThemedText>

          <AppViewEnabledSection
            appViewEnabled={appViewEnabled}
            onChange={setAppViewEnabled}
            accentColor={accentColor}
            borderColor={borderColor}
            secondaryText={secondaryText}
            warningBackground={warningBackground}
            warningBorder={warningBorder}
            warningText={warningText}
          />

          <SettingsSection title={t('settings.appView.defaultSection')}>
            <ThemedView style={[styles.sectionCard, { borderColor }]}>
              {appViewPresets.map((preset, index) => {
                const active = config.preset === preset.id;
                return (
                  <PresetRow
                    key={preset.id}
                    accentColor={accentColor}
                    active={active}
                    borderColor={borderColor}
                    description={preset.description}
                    label={preset.label}
                    last={index === appViewPresets.length - 1}
                    onPress={() => setPreset(preset.id)}
                    secondaryText={secondaryText}
                  />
                );
              })}
            </ThemedView>
          </SettingsSection>

          {config.preset === 'custom' ? (
            <SettingsSection title={t('settings.appView.customSection')}>
              <ThemedText style={[styles.fieldHint, { color: secondaryText }]}>
                {t('settings.appView.customHint')}
              </ThemedText>
              <ThemedView style={[styles.sectionCard, { borderColor }]}>
                <ThemedView style={styles.fieldRow}>
                  <ThemedText style={[styles.fieldLabel, { color: secondaryText }]}>
                    {t('settings.appView.customUrlLabel')}
                  </ThemedText>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    onBlur={handleCustomUrlBlur}
                    onChangeText={setCustomUrlDraft}
                    placeholder="https://api.example.com"
                    placeholderTextColor={secondaryText}
                    style={[styles.input, { backgroundColor: inputBackground, color: inputText }]}
                    value={customUrlDraft}
                  />
                </ThemedView>
                <ThemedView style={[styles.fieldRow, { borderTopColor: borderColor, borderTopWidth: layout.hairline }]}>
                  <ThemedText style={[styles.fieldLabel, { color: secondaryText }]}>
                    {t('settings.appView.customDidLabel')}
                  </ThemedText>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    onBlur={handleCustomDidBlur}
                    onChangeText={setCustomDidDraft}
                    placeholder="did:web:api.example.com"
                    placeholderTextColor={secondaryText}
                    style={[styles.input, { backgroundColor: inputBackground, color: inputText }]}
                    value={customDidDraft}
                  />
                </ThemedView>
              </ThemedView>
            </SettingsSection>
          ) : null}

          <SettingsSection title={t('settings.appView.activeSection')}>
            <ThemedView style={[styles.sectionCard, { borderColor }]}>
              <SettingsRow
                borderColor={borderColor}
                description={resolvedAppView.url}
                label={t('settings.appView.activeUrl')}
                showDivider
              />
              <SettingsRow
                borderColor={borderColor}
                description={resolvedAppView.did || t('settings.appView.noProxy')}
                label={t('settings.appView.activeDid')}
                showDivider={false}
              />
            </ThemedView>
          </SettingsSection>

          <SettingsSection title={t('settings.cdn.section')}>
            <ThemedText style={[styles.fieldHint, { color: secondaryText }]}>
              {t('settings.cdn.intro')}
            </ThemedText>
            <ThemedView style={[styles.sectionCard, { borderColor }]}>
              {cdnPresets.map((preset, index) => {
                const active = config.cdnPreset === preset.id;
                return (
                  <PresetRow
                    key={preset.id}
                    accentColor={accentColor}
                    active={active}
                    borderColor={borderColor}
                    description={preset.description}
                    label={preset.label}
                    last={index === cdnPresets.length - 1}
                    onPress={() => setCdnPreset(preset.id)}
                    secondaryText={secondaryText}
                  />
                );
              })}
            </ThemedView>
          </SettingsSection>

          {config.cdnPreset === 'custom' ? (
            <SettingsSection title={t('settings.cdn.customSection')}>
              <ThemedView style={[styles.sectionCard, { borderColor }]}>
                <ThemedView style={styles.fieldRow}>
                  <ThemedText style={[styles.fieldLabel, { color: secondaryText }]}>
                    {t('settings.cdn.customUrlLabel')}
                  </ThemedText>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    onBlur={handleCustomCdnBlur}
                    onChangeText={setCustomCdnDraft}
                    placeholder="https://cdn.blueat.net"
                    placeholderTextColor={secondaryText}
                    style={[styles.input, { backgroundColor: inputBackground, color: inputText }]}
                    value={customCdnDraft}
                  />
                </ThemedView>
              </ThemedView>
            </SettingsSection>
          ) : null}

          <SettingsSection title={t('settings.cdn.activeSection')}>
            <ThemedView style={[styles.sectionCard, { borderColor }]}>
              <SettingsRow
                borderColor={borderColor}
                description={resolvedCdnHost ?? t('settings.cdn.noOverride')}
                label={t('settings.cdn.activeHost')}
                showDivider={false}
              />
            </ThemedView>
          </SettingsSection>

          {accounts.length > 0 ? (
            <SettingsSection title={t('settings.appView.perAccountSection')}>
              <ThemedText style={[styles.fieldHint, { color: secondaryText }]}>
                {t('settings.appView.perAccountHint')}
              </ThemedText>
              <ThemedView style={[styles.sectionCard, { borderColor }]}>
                {accounts.map((account, index) => (
                  <PerAccountRow
                    key={account.did}
                    account={account}
                    accountProfile={accountProfiles?.[account.did]}
                    accentColor={accentColor}
                    borderColor={borderColor}
                    globalConfig={config}
                    onChange={(choice) => handlePerAccountChange(account, choice)}
                    secondaryText={secondaryText}
                    showDivider={index < accounts.length - 1}
                  />
                ))}
              </ThemedView>
            </SettingsSection>
          ) : null}
        </SettingsScroll>
      </KeyboardAvoidingView>
    </SettingsSubpageLayout>
  );
}

function PresetRow({
  accentColor,
  active,
  borderColor,
  description,
  label,
  last,
  onPress,
  secondaryText,
}: {
  accentColor: string;
  active: boolean;
  borderColor: string;
  description: string;
  label: string;
  last: boolean;
  onPress: () => void;
  secondaryText: string;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      
      onPress={onPress}
      style={({ pressed }) => [styles.presetRow,
        !last && { borderBottomColor: borderColor, borderBottomWidth: layout.hairline }, pressed && { opacity: 0.7 }]}
    >
      <ThemedView style={styles.presetText}>
        <ThemedText style={styles.presetLabel}>{label}</ThemedText>
        <ThemedText style={[styles.presetDescription, { color: secondaryText }]}>
          {description}
        </ThemedText>
      </ThemedView>
      {active ? (
        <IconSymbol color={accentColor} name="checkmark.circle.fill" size={22} />
      ) : (
        <ThemedView style={[styles.radioOutline, { borderColor: secondaryText }]} />
      )}
    </Pressable>
  );
}

type PerAccountRowProps = {
  account: Account;
  accountProfile?: { displayName?: string; avatar?: string };
  accentColor: string;
  borderColor: string;
  globalConfig: ReturnType<typeof useAppViewSettings>['config'];
  onChange: (choice: AccountPickValue) => void;
  secondaryText: string;
  showDivider: boolean;
};

function PerAccountRow({
  account,
  accountProfile,
  accentColor,
  borderColor,
  globalConfig,
  onChange,
  secondaryText,
  showDivider,
}: PerAccountRowProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const choices: { id: AccountPickValue; label: string }[] = [
    { id: 'default', label: t('settings.appView.choice.default') },
    { id: 'bsky', label: APP_VIEW_PRESETS.bsky.label },
    { id: 'blacksky', label: APP_VIEW_PRESETS.blacksky.label },
    { id: 'custom', label: t('settings.appView.choice.custom') },
  ];
  const current: AccountPickValue = account.appView?.preset ?? 'default';
  const effective = resolveAccountAppView(account, globalConfig);
  const summary =
    current === 'default'
      ? t('settings.appView.choice.defaultSummary', { url: effective.url })
      : effective.url;

  const displayName = accountProfile?.displayName ?? account.displayName ?? account.handle;

  return (
    <ThemedView
      style={[
        styles.perAccountContainer,
        showDivider && { borderBottomColor: borderColor, borderBottomWidth: layout.hairline },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [styles.perAccountHeader, pressed && { opacity: 0.7 }]}
      >
        <ThemedView style={styles.presetText}>
          <ThemedText style={styles.presetLabel}>@{account.handle}</ThemedText>
          <ThemedText style={[styles.presetDescription, { color: secondaryText }]} numberOfLines={1}>
            {displayName !== account.handle ? `${displayName} · ` : ''}{summary}
          </ThemedText>
        </ThemedView>
        <IconSymbol
          color={secondaryText}
          name={expanded ? 'chevron.up' : 'chevron.down'}
          size={18}
        />
      </Pressable>
      {expanded ? (
        <ThemedView style={styles.perAccountChoices}>
          {choices.map((choice, idx) => {
            const active = current === choice.id;
            return (
              <Pressable
                key={choice.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                
                onPress={() => onChange(choice.id)}
                style={({ pressed }) => [styles.perAccountChoice,
                  idx < choices.length - 1 && { borderBottomColor: borderColor, borderBottomWidth: layout.hairline }, pressed && { opacity: 0.7 }]}
              >
                <ThemedText style={styles.presetLabel}>{choice.label}</ThemedText>
                {active ? (
                  <IconSymbol color={accentColor} name="checkmark.circle.fill" size={20} />
                ) : (
                  <ThemedView style={[styles.radioOutline, { borderColor: secondaryText }]} />
                )}
              </Pressable>
            );
          })}
        </ThemedView>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contentContainer: {
    paddingBottom: spacing.xxxl,
  },
  intro: {
    fontSize: fontSize.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionCard: {
    marginHorizontal: spacing.lg,
    borderWidth: layout.hairline,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  presetText: { flex: 1, marginRight: spacing.md },
  presetLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  presetDescription: {
    fontSize: fontSize.sm,
    marginTop: spacing.xxs,
  },
  radioOutline: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  },
  fieldHint: {
    fontSize: fontSize.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  fieldRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  fieldLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  input: {
    fontSize: fontSize.base,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  perAccountContainer: {},
  perAccountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  perAccountChoices: {},
  perAccountChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    paddingVertical: spacing.sm,
  },
});
