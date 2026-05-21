import React, { useState } from 'react';
import { StyleSheet } from 'react-native';

import { GuestSignInRequired } from '@/components/GuestSignInRequired';
import { ResultsList } from '@/components/settings/following-cleanup/ResultsList';
import { ScanCard } from '@/components/settings/following-cleanup/ScanCard';
import { SkippedSection } from '@/components/settings/following-cleanup/SkippedSection';
import { SortPicker, type SortMode } from '@/components/settings/following-cleanup/SortPicker';
import { ThresholdPicker, type Threshold } from '@/components/settings/following-cleanup/ThresholdPicker';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { SettingsScroll } from '@/components/settings/SettingsScroll';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { fontSize, layout, spacing } from '@/constants/tokens';
import { useIsGuest } from '@/hooks/queries/useIsGuest';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useFollowingCleanupController } from '@/hooks/useFollowingCleanupController';
import { useFollowingCleanupFilters } from '@/hooks/useFollowingCleanupFilters';
import { useFollowingCleanupSkips } from '@/hooks/useFollowingCleanupSkips';
import { useRateLimitWait } from '@/hooks/useRateLimitWait';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { useProfileHref } from '@/utils/navigation';

export default function FollowingCleanupScreen() {
  const borderColor = useBorderColor();
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const dangerColor = useThemeColor({ light: '#DC2626', dark: '#F87171' }, 'text');
  const { t } = useTranslation();
  const isGuest = useIsGuest();
  const profileHref = useProfileHref();

  const {
    accountDid,
    currentAccount,
    token,
    state,
    start,
    pause,
    clear,
    unfollow,
    unfollowPending,
  } = useFollowingCleanupController();
  const { skipped: skippedDids, skip, unskip, clearAll: clearAllSkips } =
    useFollowingCleanupSkips(accountDid);

  const [threshold, setThreshold] = useState<Threshold>(90);
  const [sortMode, setSortMode] = useState<SortMode>('lastActivity');

  const rateLimitWaitMs = useRateLimitWait(currentAccount?.pdsUrl);
  const nowMs = Date.now();
  const { filteredFollows, skippedEntries } = useFollowingCleanupFilters(
    state,
    skippedDids,
    threshold,
    sortMode,
    nowMs,
  );

  const isRunning = state.runState === 'running';
  const isPaused = state.runState === 'paused';
  const isCompleted = state.runState === 'completed';
  const hasAnyData = state.totalDiscovered > 0;

  // Rate-limit text takes priority over the normal run-state subtitle — we
  // want the user to know we're waiting on the PDS regardless of whether
  // the scan is paused or running.
  const scanSubtitle =
    rateLimitWaitMs > 0
      ? t('settings.followingCleanup.scanRateLimited', {
          seconds: Math.ceil(rateLimitWaitMs / 1000),
          count: state.totalScanned,
          total: state.totalDiscovered,
        })
      : isRunning
      ? t('settings.followingCleanup.scanProgress', {
          count: state.totalScanned,
          total: state.totalDiscovered,
        })
      : isPaused
      ? t('settings.followingCleanup.scanPaused', {
          count: state.totalScanned,
          total: state.totalDiscovered,
        })
      : isCompleted
      ? t('settings.followingCleanup.scanComplete', { count: state.totalScanned })
      : t('settings.followingCleanup.scanHint');

  if (isGuest) {
    return <GuestSignInRequired title={t('settings.followingCleanup.title')} />;
  }

  return (
    <SettingsSubpageLayout title={t('settings.followingCleanup.title')}>
      <SettingsScroll
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <ThemedView style={[styles.introCard, { borderColor }]}>
          <ThemedText style={[styles.introText, { color: subduedColor }]}>
            {t('settings.followingCleanup.intro')}
          </ThemedText>
        </ThemedView>

        <ThresholdPicker
          threshold={threshold}
          onChange={setThreshold}
          borderColor={borderColor}
          tintColor={tintColor}
          textColor={textColor}
        />

        <SortPicker
          sortMode={sortMode}
          onChange={setSortMode}
          borderColor={borderColor}
          tintColor={tintColor}
          textColor={textColor}
        />

        <ScanCard
          isRunning={isRunning}
          isPaused={isPaused}
          hasAnyData={hasAnyData}
          rateLimitWaitMs={rateLimitWaitMs}
          scanSubtitle={scanSubtitle}
          onStart={start}
          onPause={pause}
          onClear={clear}
          startDisabled={!token || !currentAccount?.pdsUrl}
          borderColor={borderColor}
          tintColor={tintColor}
          textColor={textColor}
          subduedColor={subduedColor}
          dangerColor={dangerColor}
        />

        <ResultsList
          filteredFollows={filteredFollows}
          hasAnyData={hasAnyData}
          isRunning={isRunning}
          nowMs={nowMs}
          profileHref={profileHref}
          onUnfollow={(entry) => unfollow(entry.profile)}
          onSkip={skip}
          unfollowPending={unfollowPending}
          borderColor={borderColor}
          textColor={textColor}
          subduedColor={subduedColor}
          dangerColor={dangerColor}
        />

        {skippedDids.size > 0 ? (
          <SkippedSection
            skippedCount={skippedDids.size}
            skippedEntries={skippedEntries}
            profileHref={profileHref}
            onUnskip={unskip}
            onClearAll={clearAllSkips}
            borderColor={borderColor}
            textColor={textColor}
            subduedColor={subduedColor}
            tintColor={tintColor}
          />
        ) : null}
      </SettingsScroll>
    </SettingsSubpageLayout>
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
    borderWidth: layout.hairline,
  },
  introText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
});
