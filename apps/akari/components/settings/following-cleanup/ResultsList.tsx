import { StyleSheet, View } from 'react-native';

import { FollowRow } from '@/components/settings/following-cleanup/FollowRow';
import { SettingsSection } from '@/components/settings/SettingsList';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { fontSize, layout, spacing } from '@/constants/tokens';
import { useFollowingCleanupLabels } from '@/hooks/useFollowingCleanupLabels';
import { useTranslation } from '@/hooks/useTranslation';
import type { FollowingCleanupEntry } from '@/utils/followingCleanupController';

export type ResultsListProps = {
  filteredFollows: FollowingCleanupEntry[];
  hasAnyData: boolean;
  isRunning: boolean;
  nowMs: number;
  profileHref: (handle: string) => string;
  onUnfollow: (entry: FollowingCleanupEntry) => void;
  onSkip: (did: string) => void;
  unfollowPending: boolean;
  borderColor: string;
  textColor: string;
  subduedColor: string;
  dangerColor: string;
};

export function ResultsList({
  filteredFollows,
  hasAnyData,
  isRunning,
  nowMs,
  profileHref,
  onUnfollow,
  onSkip,
  unfollowPending,
  borderColor,
  textColor,
  subduedColor,
  dangerColor,
}: ResultsListProps) {
  const { t } = useTranslation();
  const { getLastActivityLabel, getFollowedAtLabel, getStatsLabel } =
    useFollowingCleanupLabels(nowMs);

  return (
    <SettingsSection
      title={t('settings.followingCleanup.resultsHeader', { count: filteredFollows.length })}
    >
      <ThemedView style={[styles.sectionCard, { borderColor }]}>
        {!hasAnyData ? (
          <View style={styles.emptyState}>
            <ThemedText style={[styles.emptyText, { color: subduedColor }]}>
              {t('settings.followingCleanup.resultsEmpty')}
            </ThemedText>
          </View>
        ) : filteredFollows.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText style={[styles.emptyText, { color: subduedColor }]}>
              {isRunning
                ? t('settings.followingCleanup.resultsStreaming')
                : t('settings.followingCleanup.noMatches')}
            </ThemedText>
          </View>
        ) : (
          filteredFollows.map((entry, index) => (
            <FollowRow
              key={entry.profile.did}
              entry={entry}
              isLast={index === filteredFollows.length - 1}
              href={profileHref(entry.profile.handle)}
              onUnfollow={() => onUnfollow(entry)}
              onSkip={() => onSkip(entry.profile.did)}
              unfollowPending={unfollowPending}
              borderColor={borderColor}
              textColor={textColor}
              subduedColor={subduedColor}
              dangerColor={dangerColor}
              unfollowLabel={t('common.unfollow')}
              skipLabel={t('settings.followingCleanup.skip')}
              lastActivityLabel={getLastActivityLabel(entry)}
              followedAtLabel={getFollowedAtLabel(entry)}
              statsLabel={getStatsLabel(entry)}
            />
          ))
        )}
      </ThemedView>
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: layout.hairline,
    backgroundColor: 'transparent',
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
});
