import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, View } from 'react-native';

import {
  SettingsSection,
} from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import type { AiPreferenceCategory, AiPreferencesRecord } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useAiPreferences } from '@/hooks/queries/useAiPreferences';
import {
  buildAiPreferencesRecord,
  DEFAULT_AI_PREFERENCES,
  useUpdateAiPreferences,
} from '@/hooks/mutations/useUpdateAiPreferences';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

const CATEGORY_ROWS = [
  {
    key: 'training',
    icon: 'brain.head.profile',
    labelKey: 'settings.ai.training.label',
    hintKey: 'settings.ai.training.hint',
  },
  {
    key: 'inference',
    icon: 'sparkles',
    labelKey: 'settings.ai.inference.label',
    hintKey: 'settings.ai.inference.hint',
  },
  {
    key: 'embedding',
    icon: 'magnifyingglass',
    labelKey: 'settings.ai.embedding.label',
    hintKey: 'settings.ai.embedding.hint',
  },
  {
    key: 'syntheticContent',
    icon: 'wand.and.stars',
    labelKey: 'settings.ai.syntheticContent.label',
    hintKey: 'settings.ai.syntheticContent.hint',
  },
] as const satisfies readonly {
  key: AiPreferenceCategory;
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  labelKey: string;
  hintKey: string;
}[];

const FLUSH_DELAY_MS = 350;

export default function AiSettingsScreen() {
  const { t } = useTranslation();
  const borderColor = useBorderColor();
  const iconColor = useThemeColor({}, 'text');
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const { data: currentAccount } = useCurrentAccount();
  const { data: aiPrefs, isLoading, isFetched } = useAiPreferences();
  const updateAi = useUpdateAiPreferences();
  const queryClient = useQueryClient();

  const aiPrefsQueryKey = useMemo(
    () => ['aiPreferences', currentAccount?.did, currentAccount?.pdsUrl] as const,
    [currentAccount?.did, currentAccount?.pdsUrl],
  );

  // Effective values shown in the Switches: prefer the cached record,
  // fall back to defaults. The cache reflects optimistic toggles, so
  // this stays in sync with what the user just tapped.
  const values = useMemo<Record<AiPreferenceCategory, boolean>>(() => {
    if (aiPrefs) {
      return {
        embedding: aiPrefs.preferences.embedding?.allow ?? DEFAULT_AI_PREFERENCES.embedding,
        inference: aiPrefs.preferences.inference?.allow ?? DEFAULT_AI_PREFERENCES.inference,
        syntheticContent:
          aiPrefs.preferences.syntheticContent?.allow ?? DEFAULT_AI_PREFERENCES.syntheticContent,
        training: aiPrefs.preferences.training?.allow ?? DEFAULT_AI_PREFERENCES.training,
      };
    }
    return { ...DEFAULT_AI_PREFERENCES };
  }, [aiPrefs]);

  // When the user opens this screen and they have no
  // `community.lexicon.preference.ai` record yet, write a baseline one
  // immediately with all flags off. Without this, services that respect
  // the lexicon would see "no record" rather than the user's intended
  // deny. Runs once per account, gated by a ref.
  const hasBootstrappedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentAccount?.did) return;
    if (!isFetched) return;
    if (aiPrefs !== null) return;
    if (hasBootstrappedRef.current === currentAccount.did) return;
    if (updateAi.isPending) return;
    hasBootstrappedRef.current = currentAccount.did;
    const baseline = buildAiPreferencesRecord(DEFAULT_AI_PREFERENCES, null);
    queryClient.setQueryData<AiPreferencesRecord | null>(aiPrefsQueryKey, baseline);
    updateAi.mutate(baseline);
  }, [aiPrefs, aiPrefsQueryKey, currentAccount?.did, isFetched, queryClient, updateAi]);

  // Debounce flushing toggle changes to the PDS so a quick double-tap
  // (or someone flipping multiple switches in a row) collapses into a
  // single PUT. The cache is updated synchronously on toggle so the
  // Switch reflects the new value immediately — the debounce only
  // delays the network write.
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPending = useCallback(() => {
    flushTimerRef.current = null;
    const latest = queryClient.getQueryData<AiPreferencesRecord | null>(aiPrefsQueryKey);
    if (!latest) return;
    updateAi.mutate(latest);
  }, [aiPrefsQueryKey, queryClient, updateAi]);

  // Flush any pending change on unmount so a toggle right before
  // navigating away isn't dropped.
  useEffect(
    () => () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushPending();
      }
    },
    [flushPending],
  );

  const handleToggle = useCallback(
    (key: AiPreferenceCategory, allow: boolean) => {
      // Synchronously update the cache so the Switch shows the new
      // value immediately — no waiting for the network. The cache
      // becomes the source of truth for "what we'll PUT next".
      queryClient.setQueryData<AiPreferencesRecord | null>(aiPrefsQueryKey, (existing) =>
        buildAiPreferencesRecord({ [key]: allow }, existing ?? null),
      );
      // Restart the debounce timer; consecutive toggles within
      // FLUSH_DELAY_MS coalesce into one PUT.
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushTimerRef.current = setTimeout(flushPending, FLUSH_DELAY_MS);
    },
    [aiPrefsQueryKey, flushPending, queryClient],
  );

  return (
    <SettingsSubpageLayout title={t('settings.ai.title')}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <ThemedText style={[styles.intro, { color: subduedColor }]}>
          {t('settings.ai.intro')}
        </ThemedText>

        <SettingsSection isFirst title={t('settings.ai.section')}>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            {CATEGORY_ROWS.map((row, index) => (
              <ThemedView
                key={row.key}
                style={[
                  styles.toggleRow,
                  index < CATEGORY_ROWS.length - 1 && {
                    borderBottomColor: borderColor,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <IconSymbol color={iconColor} name={row.icon} size={20} style={styles.toggleIcon} />
                <View style={styles.toggleLabelWrap}>
                  <ThemedText style={styles.toggleLabel}>{t(row.labelKey)}</ThemedText>
                  <ThemedText style={[styles.toggleHint, { color: subduedColor }]}>
                    {t(row.hintKey)}
                  </ThemedText>
                </View>
                <Switch
                  value={values[row.key]}
                  onValueChange={(allow) => handleToggle(row.key, allow)}
                />
              </ThemedView>
            ))}
          </ThemedView>
        </SettingsSection>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
          </View>
        ) : null}
      </ScrollView>
    </SettingsSubpageLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  contentContainer: { paddingBottom: 32 },
  intro: { fontSize: 14, paddingHorizontal: 16, paddingTop: 16, lineHeight: 20 },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toggleIcon: { marginRight: 12 },
  toggleLabelWrap: { flex: 1, paddingRight: 12 },
  toggleLabel: { fontSize: 16, fontWeight: '500' },
  toggleHint: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  loading: { paddingVertical: 24, alignItems: 'center' },
});
