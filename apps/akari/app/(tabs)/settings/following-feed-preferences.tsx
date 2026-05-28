import React from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import type { BlueskyFeedViewPref } from '@/bluesky-api';
import { FollowingFeedToggle } from '@/components/settings/FollowingFeedToggle';
import { SettingsSection } from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { SettingsScroll } from '@/components/settings/SettingsScroll';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { fontSize, fontWeight, layout, spacing } from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useUpdateFeedViewPref } from '@/hooks/mutations/useUpdateFeedViewPref';
import { usePreferences } from '@/hooks/queries/usePreferences';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

const HOME_FEED = 'home';

export default function FollowingFeedPreferencesScreen() {
  const borderColor = useBorderColor();
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const textColor = useThemeColor({}, 'text');
  const { t } = useTranslation();
  const { showToast } = useToast();

  const { data: prefs } = usePreferences();
  const update = useUpdateFeedViewPref();

  const home = prefs?.preferences.find(
    (p): p is BlueskyFeedViewPref =>
      p.$type === 'app.bsky.actor.defs#feedViewPref' && p.feed === HOME_FEED,
  );

  const apply = (patch: Partial<Omit<BlueskyFeedViewPref, '$type' | 'feed'>>) => {
    update.mutate(
      { feed: HOME_FEED, patch },
      {
        onError: () =>
          showToast({ type: 'error', message: t('common.somethingWentWrong') }),
      },
    );
  };

  return (
    <SettingsSubpageLayout title={t('settings.followingFeedPreferences')}>
      <SettingsScroll
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <ThemedText style={[styles.intro, { color: subduedColor }]}>
          {t('settings.followingFeedPreferencesIntro')}
        </ThemedText>

        <SettingsSection>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <FollowingFeedToggle
              label={t('settings.followingFeedHideReplies')}
              value={!!home?.hideReplies}
              onChange={(next) => apply({ hideReplies: next })}
              borderColor={borderColor}
              textColor={textColor}
            />
            <FollowingFeedToggle
              label={t('settings.followingFeedHideReposts')}
              value={!!home?.hideReposts}
              onChange={(next) => apply({ hideReposts: next })}
              borderColor={borderColor}
              textColor={textColor}
            />
            <View style={styles.toggleRow}>
              <ThemedText style={[styles.toggleLabel, { color: textColor }]}>
                {t('settings.followingFeedHideQuotePosts')}
              </ThemedText>
              <Switch
                value={!!home?.hideQuotePosts}
                onValueChange={(next) => apply({ hideQuotePosts: next })}
              />
            </View>
          </ThemedView>
        </SettingsSection>
      </SettingsScroll>
    </SettingsSubpageLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  contentContainer: { paddingBottom: spacing.xxl },
  intro: {
    marginHorizontal: spacing.lg,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  sectionCard: {
    marginHorizontal: spacing.lg,
    borderWidth: layout.hairline,
    backgroundColor: 'transparent',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  toggleLabel: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
});
