import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { BlueskyProfile } from '@/bluesky-api';
import { getRateLimitCooldownUntil } from '@/bluesky-api';
import { Image } from '@/components/Image';
import { SettingsSection } from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { activeOpacity, fontSize, fontWeight, hitSlop, layout, radius, spacing } from '@/constants/tokens';
import { PressableLink } from '@/components/ui/PressableLink';
import { useToast } from '@/contexts/ToastContext';
import { useFollowUser } from '@/hooks/mutations/useFollowUser';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useFollowingCleanupSkips } from '@/hooks/useFollowingCleanupSkips';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { apiForAccount } from '@/utils/blueskyApi';
import {
  type FollowingCleanupEntry,
  type FollowingCleanupState,
  followingCleanupQueryKey,
  getFollowingCleanupController,
  initialFollowingCleanupState,
} from '@/utils/followingCleanupController';
import { useProfileHref } from '@/utils/navigation';

const AVATAR_SIZE = 36;
const DAY_MS = 24 * 60 * 60 * 1000;

// Locale-aware compact format e.g. "1.2K" / "3.4M". Falls back to a
// plain integer string on engines that don't support compact notation.
const compactFormatter =
  typeof Intl !== 'undefined' && typeof Intl.NumberFormat === 'function'
    ? new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 })
    : null;
const formatCompact = (n: number) => (compactFormatter ? compactFormatter.format(n) : String(n));

type Threshold = 30 | 90 | 180 | 365 | 'never';
type SortMode = 'lastActivity' | 'followedAt' | 'fewestPosts' | 'mostFollowers';

const THRESHOLD_OPTIONS: Threshold[] = [30, 90, 180, 365, 'never'];
const SORT_OPTIONS: SortMode[] = ['lastActivity', 'followedAt', 'fewestPosts', 'mostFollowers'];

export default function FollowingCleanupScreen() {
  const borderColor = useBorderColor();
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const dangerColor = useThemeColor({ light: '#DC2626', dark: '#F87171' }, 'text');
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const profileHref = useProfileHref();
  const followMutation = useFollowUser();

  const accountDid = currentAccount?.did;
  const { skipped: skippedDids, skip, unskip, clearAll: clearAllSkips } =
    useFollowingCleanupSkips(accountDid);

  // React Query is the source of truth for the scan state — the controller
  // writes here on a flush interval so the data persists across navigation
  // and shows up live in devtools. We use `initialData` (synchronous) rather
  // than a `queryFn` to avoid a race where the queryFn's resolved promise
  // clobbers an early controller flush on a freshly-mounted screen.
  //
  // `meta.persist: false` opts this query out of the app-wide MMKV-backed
  // PersistQueryClientProvider — otherwise the scan would appear to "still
  // be running" after a web reload even though the controller singleton
  // (which holds the worker pool) is gone. We want a clean Start button
  // on every cold load.
  const stateQuery = useQuery<FollowingCleanupState>({
    queryKey: followingCleanupQueryKey(accountDid),
    enabled: !!accountDid,
    queryFn: () => initialFollowingCleanupState(),
    initialData: () => initialFollowingCleanupState(),
    staleTime: Infinity,
    gcTime: Infinity,
    meta: { persist: false },
  });

  const state = stateQuery.data ?? initialFollowingCleanupState();

  // Reconcile any rehydrated cache state with the live controller. If the
  // app's PersistQueryClientProvider restored a snapshot saved mid-scan
  // (from before `meta.persist: false` was applied), the cached state can
  // claim "running" even though the worker pool was wiped on web reload.
  // Pushing the controller's actual state into the cache once on mount
  // unsticks that — on a fresh controller it's idle, so the user lands
  // on a Start button; if a scan is genuinely in flight (cross-navigation
  // within the same session), the controller state matches the cache and
  // this is a no-op.
  useEffect(() => {
    if (!accountDid) return;
    const ctrl = getFollowingCleanupController(queryClient, accountDid);
    const live = ctrl.getState();
    queryClient.setQueryData(followingCleanupQueryKey(accountDid), {
      ...live,
      entries: { ...live.entries },
    });
  }, [accountDid, queryClient]);

  const [threshold, setThreshold] = useState<Threshold>(90);
  const [sortMode, setSortMode] = useState<SortMode>('lastActivity');
  const [rateLimitTick, setRateLimitTick] = useState(0);
  // Poll the client's rate-limit state once a second while a scan is in
  // flight so we can show a "paused for rate limit, Ns" hint.
  useEffect(() => {
    if (!currentAccount?.pdsUrl) return;
    const id = setInterval(() => setRateLimitTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [currentAccount?.pdsUrl]);
  const rateLimitWaitMs = useMemo(() => {
    if (!currentAccount?.pdsUrl) return 0;
    const until = getRateLimitCooldownUntil(currentAccount.pdsUrl);
    if (!until) return 0;
    return Math.max(0, until - Date.now());
    // rateLimitTick included so the memo recomputes each second.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAccount?.pdsUrl, rateLimitTick]);

  const handleStart = useCallback(() => {
    if (!token || !currentAccount?.pdsUrl || !accountDid) {
      showToast({ type: 'error', message: t('common.somethingWentWrong') });
      return;
    }
    const ctrl = getFollowingCleanupController(queryClient, accountDid);
    const api = apiForAccount(currentAccount);
    ctrl.start({ api, token }).catch((err) => {
      // start() shouldn't throw — producers/workers catch internally — but
      // surface any unhandled error to the console so a broken scan isn't
      // silent.
      console.error('Following cleanup scan failed:', err);
      showToast({ type: 'error', message: t('common.somethingWentWrong') });
    });
  }, [accountDid, currentAccount, queryClient, showToast, t, token]);

  const handlePause = useCallback(() => {
    if (!accountDid) return;
    const ctrl = getFollowingCleanupController(queryClient, accountDid);
    ctrl.pause();
  }, [accountDid, queryClient]);

  const handleClear = useCallback(() => {
    if (!accountDid) return;
    const ctrl = getFollowingCleanupController(queryClient, accountDid);
    ctrl.clear();
  }, [accountDid, queryClient]);

  const handleUnfollow = useCallback(
    (profile: BlueskyProfile) => {
      const followUri = profile.viewer?.following;
      if (!followUri) {
        showToast({ type: 'error', message: t('settings.followingCleanup.unfollowFailed') });
        return;
      }
      if (!accountDid) return;
      const ctrl = getFollowingCleanupController(queryClient, accountDid);
      const previousEntry = ctrl.getState().entries[profile.did];

      // Optimistically remove so the row disappears immediately. If the
      // server rejects, we restore the entry from the snapshot we just
      // captured. This sidesteps any "did onSuccess actually run" debug
      // confusion.
      ctrl.removeProfile(profile.did);

      followMutation.mutate(
        { did: profile.did, followUri, action: 'unfollow' },
        {
          onError: () => {
            if (previousEntry) ctrl.restoreEntry(previousEntry);
            showToast({ type: 'error', message: t('settings.followingCleanup.unfollowFailed') });
          },
        },
      );
    },
    [accountDid, followMutation, queryClient, showToast, t],
  );

  const nowMs = Date.now();

  const filteredFollows = useMemo(() => {
    const results: FollowingCleanupEntry[] = [];
    for (const entry of Object.values(state.entries)) {
      if (entry.status !== 'done') continue;
      if (skippedDids.has(entry.profile.did)) continue;
      if (threshold === 'never') {
        if (entry.lastActivityAt === null) results.push(entry);
        continue;
      }
      if (entry.lastActivityAt === null) {
        results.push(entry);
        continue;
      }
      const age = nowMs - new Date(entry.lastActivityAt).getTime();
      if (age >= threshold * DAY_MS) results.push(entry);
    }
    results.sort((a, b) => {
      switch (sortMode) {
        case 'followedAt': {
          // Oldest follow first — null sorts to the bottom (assumed recent).
          const ax = a.followedAt ? new Date(a.followedAt).getTime() : Number.POSITIVE_INFINITY;
          const bx = b.followedAt ? new Date(b.followedAt).getTime() : Number.POSITIVE_INFINITY;
          return ax - bx;
        }
        case 'fewestPosts': {
          const ax = a.profile.postsCount ?? 0;
          const bx = b.profile.postsCount ?? 0;
          return ax - bx;
        }
        case 'mostFollowers': {
          const ax = a.profile.followersCount ?? 0;
          const bx = b.profile.followersCount ?? 0;
          return bx - ax;
        }
        case 'lastActivity':
        default: {
          const ax = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
          const bx = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
          return ax - bx;
        }
      }
    });
    return results;
  }, [state.entries, threshold, nowMs, skippedDids, sortMode]);

  // Profiles the user has skipped that we actually scanned (so we have
  // the profile object to show in the "skipped" subsection). DIDs without
  // a corresponding entry are kept in the underlying set but invisible
  // here until the next scan resurfaces them.
  const skippedEntries = useMemo(() => {
    const out: FollowingCleanupEntry[] = [];
    for (const did of skippedDids) {
      const entry = state.entries[did];
      if (entry) out.push(entry);
    }
    return out;
  }, [skippedDids, state.entries]);

  const isRunning = state.runState === 'running';
  const isPaused = state.runState === 'paused';
  const isCompleted = state.runState === 'completed';
  const hasAnyData = state.totalDiscovered > 0;

  const getLastActivityLabel = (entry: FollowingCleanupEntry) => {
    if (entry.lastActivityAt === null) {
      // getProfiles enrichment lands postsCount; if the account actually
      // has posts but the author feed came back empty, that's an AppView
      // gap rather than a genuinely silent account — flag it as unknown
      // so we don't accidentally tar an active poster as "never posted."
      const posts = entry.profile.postsCount;
      if (posts === undefined) return t('settings.followingCleanup.activityUnknown');
      if (posts > 0) return t('settings.followingCleanup.activityUnknown');
      return t('settings.followingCleanup.neverPosted');
    }
    const ageDays = Math.floor((nowMs - new Date(entry.lastActivityAt).getTime()) / DAY_MS);
    if (ageDays < 1) return t('settings.followingCleanup.lastSeenToday');
    if (ageDays === 1) return t('settings.followingCleanup.lastSeenOneDay');
    return t('settings.followingCleanup.lastSeenDays', { count: ageDays });
  };

  const getFollowedAtLabel = (entry: FollowingCleanupEntry) => {
    if (!entry.followedAt) return null;
    const ageDays = Math.floor((nowMs - new Date(entry.followedAt).getTime()) / DAY_MS);
    if (ageDays < 1) return t('settings.followingCleanup.followedToday');
    if (ageDays === 1) return t('settings.followingCleanup.followedOneDay');
    if (ageDays < 30) return t('settings.followingCleanup.followedDays', { count: ageDays });
    const ageMonths = Math.floor(ageDays / 30);
    if (ageMonths < 12) return t('settings.followingCleanup.followedMonths', { count: ageMonths });
    const ageYears = Math.floor(ageDays / 365);
    return t('settings.followingCleanup.followedYears', { count: ageYears });
  };

  const getStatsLabel = (entry: FollowingCleanupEntry) => {
    const { followersCount, followsCount, postsCount } = entry.profile;
    // Counts arrive via the getProfiles enrichment pass, which trails
    // the initial getFollows discovery. Hide the line until at least
    // one count is back so we don't render a misleading "0 followers"
    // row before enrichment lands.
    if (
      followersCount === undefined &&
      followsCount === undefined &&
      postsCount === undefined
    ) {
      return null;
    }
    return t('settings.followingCleanup.stats', {
      followers: formatCompact(followersCount ?? 0),
      follows: formatCompact(followsCount ?? 0),
      posts: formatCompact(postsCount ?? 0),
    });
  };

  // Rate-limit text takes priority over the normal run-state subtitle —
  // we want the user to know we're waiting on the PDS regardless of
  // whether the scan is paused or running.
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

  return (
    <SettingsSubpageLayout title={t('settings.followingCleanup.title')}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <ThemedView style={[styles.introCard, { borderColor }]}>
          <ThemedText style={[styles.introText, { color: subduedColor }]}>
            {t('settings.followingCleanup.intro')}
          </ThemedText>
        </ThemedView>

        <SettingsSection title={t('settings.followingCleanup.thresholdHeader')}>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <View style={styles.thresholdRow}>
              {THRESHOLD_OPTIONS.map((option) => {
                const isActive = threshold === option;
                const label =
                  option === 'never'
                    ? t('settings.followingCleanup.thresholdNever')
                    : t('settings.followingCleanup.thresholdDays', { count: option });
                return (
                  <Pressable
                    key={String(option)}
                    onPress={() => setThreshold(option)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    style={({ pressed }) => [
                      styles.thresholdPill,
                      { borderColor: isActive ? tintColor : borderColor },
                      isActive && { backgroundColor: tintColor },
                      pressed && { opacity: activeOpacity.default },
                    ]}
                  >
                    <ThemedText
                      style={[styles.thresholdText, { color: isActive ? '#FFFFFF' : textColor }]}
                    >
                      {label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </ThemedView>
        </SettingsSection>

        <SettingsSection title={t('settings.followingCleanup.sortHeader')}>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <View style={styles.thresholdRow}>
              {SORT_OPTIONS.map((option) => {
                const isActive = sortMode === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setSortMode(option)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    style={({ pressed }) => [
                      styles.thresholdPill,
                      { borderColor: isActive ? tintColor : borderColor },
                      isActive && { backgroundColor: tintColor },
                      pressed && { opacity: activeOpacity.default },
                    ]}
                  >
                    <ThemedText
                      style={[styles.thresholdText, { color: isActive ? '#FFFFFF' : textColor }]}
                    >
                      {t(`settings.followingCleanup.sort.${option}`)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </ThemedView>
        </SettingsSection>

        <SettingsSection>
          <ThemedView style={[styles.sectionCard, styles.scanCard, { borderColor }]}>
            <View style={styles.scanInfoRow}>
              <View style={styles.scanInfoText}>
                <ThemedText style={[styles.scanTitle, { color: textColor }]}>
                  {t('settings.followingCleanup.scanTitle')}
                </ThemedText>
                <ThemedText style={[styles.scanSubtitle, { color: subduedColor }]}>
                  {scanSubtitle}
                </ThemedText>
              </View>
              {isRunning ? <ActivityIndicator color={tintColor} /> : null}
            </View>

            <View style={styles.scanActions}>
              {isRunning ? (
                <Pressable
                  onPress={handlePause}
                  accessibilityRole="button"
                  hitSlop={hitSlop}
                  style={({ pressed }) => [
                    styles.scanButton,
                    styles.scanButtonPrimary,
                    { borderColor: tintColor },
                    pressed && { opacity: activeOpacity.default },
                  ]}
                >
                  <ThemedText style={[styles.scanButtonText, { color: tintColor }]}>
                    {t('settings.followingCleanup.pause')}
                  </ThemedText>
                </Pressable>
              ) : (
                (() => {
                  // Paused + rate-limited: lock the button to a countdown so
                  // the user can see why "Resume" isn't available yet. The
                  // moment the cooldown lifts (the 1s tick re-renders),
                  // this collapses back to the normal "Resume" affordance.
                  const isRateLockedWhilePaused = isPaused && rateLimitWaitMs > 0;
                  const label = isRateLockedWhilePaused
                    ? t('settings.followingCleanup.waitingForRateLimit', {
                        seconds: Math.ceil(rateLimitWaitMs / 1000),
                      })
                    : isPaused
                    ? t('settings.followingCleanup.resume')
                    : hasAnyData
                    ? t('settings.followingCleanup.rescan')
                    : t('settings.followingCleanup.startScan');
                  const disabled = !token || !currentAccount?.pdsUrl || isRateLockedWhilePaused;
                  return (
                    <Pressable
                      onPress={handleStart}
                      disabled={disabled}
                      accessibilityRole="button"
                      hitSlop={hitSlop}
                      style={({ pressed }) => [
                        styles.scanButton,
                        styles.scanButtonPrimary,
                        { borderColor: tintColor },
                        pressed && !disabled && { opacity: activeOpacity.default },
                        disabled && styles.disabled,
                      ]}
                    >
                      <ThemedText style={[styles.scanButtonText, { color: tintColor }]}>
                        {label}
                      </ThemedText>
                    </Pressable>
                  );
                })()
              )}
              {hasAnyData && !isRunning ? (
                <Pressable
                  onPress={handleClear}
                  accessibilityRole="button"
                  hitSlop={hitSlop}
                  style={({ pressed }) => [
                    styles.scanButton,
                    styles.scanButtonSecondary,
                    { borderColor: dangerColor },
                    pressed && { opacity: activeOpacity.default },
                  ]}
                >
                  <ThemedText style={[styles.scanButtonText, { color: dangerColor }]}>
                    {t('settings.followingCleanup.clear')}
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
          </ThemedView>
        </SettingsSection>

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
                  onUnfollow={() => handleUnfollow(entry.profile)}
                  onSkip={() => skip(entry.profile.did)}
                  unfollowPending={followMutation.isPending}
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

        {skippedDids.size > 0 ? (
          <SettingsSection
            title={t('settings.followingCleanup.skippedHeader', { count: skippedDids.size })}
          >
            <ThemedView style={[styles.sectionCard, { borderColor }]}>
              <View style={styles.skippedHelp}>
                <ThemedText style={[styles.skippedHelpText, { color: subduedColor }]}>
                  {t('settings.followingCleanup.skippedHint')}
                </ThemedText>
                <Pressable
                  onPress={clearAllSkips}
                  accessibilityRole="button"
                  hitSlop={hitSlop}
                  style={({ pressed }) => [pressed && { opacity: activeOpacity.default }]}
                >
                  <ThemedText style={[styles.skippedClearLink, { color: tintColor }]}>
                    {t('settings.followingCleanup.skippedClearAll')}
                  </ThemedText>
                </Pressable>
              </View>
              {skippedEntries.length === 0 ? (
                <View style={styles.emptyState}>
                  <ThemedText style={[styles.emptyText, { color: subduedColor }]}>
                    {t('settings.followingCleanup.skippedScanAgainHint')}
                  </ThemedText>
                </View>
              ) : (
                skippedEntries.map((entry, index) => (
                  <SkippedRow
                    key={entry.profile.did}
                    entry={entry}
                    isLast={index === skippedEntries.length - 1}
                    href={profileHref(entry.profile.handle)}
                    onUnskip={() => unskip(entry.profile.did)}
                    borderColor={borderColor}
                    textColor={textColor}
                    subduedColor={subduedColor}
                    tintColor={tintColor}
                    unskipLabel={t('settings.followingCleanup.unskip')}
                  />
                ))
              )}
            </ThemedView>
          </SettingsSection>
        ) : null}
      </ScrollView>
    </SettingsSubpageLayout>
  );
}

type FollowRowProps = {
  entry: FollowingCleanupEntry;
  isLast: boolean;
  href: string;
  onUnfollow: () => void;
  onSkip: () => void;
  unfollowPending: boolean;
  borderColor: string;
  textColor: string;
  subduedColor: string;
  dangerColor: string;
  unfollowLabel: string;
  skipLabel: string;
  lastActivityLabel: string;
  followedAtLabel: string | null;
  statsLabel: string | null;
};

function FollowRow({
  entry,
  isLast,
  href,
  onUnfollow,
  onSkip,
  unfollowPending,
  borderColor,
  textColor,
  subduedColor,
  dangerColor,
  unfollowLabel,
  skipLabel,
  lastActivityLabel,
  followedAtLabel,
  statsLabel,
}: FollowRowProps) {
  return (
    <View
      style={[
        styles.row,
        !isLast && {
          borderBottomColor: borderColor,
          borderBottomWidth: layout.hairline,
        },
      ]}
    >
      <PressableLink
        href={href}
        accessibilityLabel={entry.profile.handle}
        style={styles.rowLinkArea}
      >
        {entry.profile.avatar ? (
          <Image source={{ uri: entry.profile.avatar }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { borderColor }]}>
            <IconSymbol name="person.fill" size={16} color={subduedColor} />
          </View>
        )}
        <View style={styles.rowText}>
          <ThemedText style={[styles.rowName, { color: textColor }]} numberOfLines={1}>
            {entry.profile.displayName?.trim() || entry.profile.handle}
          </ThemedText>
          <ThemedText style={[styles.rowHandle, { color: subduedColor }]} numberOfLines={1}>
            @{entry.profile.handle}
          </ThemedText>
          <ThemedText style={[styles.rowMeta, { color: subduedColor }]} numberOfLines={1}>
            {lastActivityLabel}
            {followedAtLabel ? ` · ${followedAtLabel}` : ''}
          </ThemedText>
          {statsLabel ? (
            <ThemedText style={[styles.rowMeta, { color: subduedColor }]} numberOfLines={1}>
              {statsLabel}
            </ThemedText>
          ) : null}
        </View>
      </PressableLink>
      <View style={styles.rowActions}>
        <Pressable
          onPress={onSkip}
          accessibilityRole="button"
          accessibilityLabel={skipLabel}
          hitSlop={hitSlop}
          style={({ pressed }) => [
            styles.actionButton,
            { borderColor: subduedColor },
            pressed && { opacity: 0.7 },
          ]}
        >
          <ThemedText style={[styles.actionText, { color: subduedColor }]}>{skipLabel}</ThemedText>
        </Pressable>
        <Pressable
          onPress={onUnfollow}
          disabled={unfollowPending}
          accessibilityRole="button"
          accessibilityLabel={unfollowLabel}
          hitSlop={hitSlop}
          style={({ pressed }) => [
            styles.actionButton,
            { borderColor: dangerColor },
            pressed && { opacity: 0.7 },
            unfollowPending && styles.disabled,
          ]}
        >
          <ThemedText style={[styles.actionText, { color: dangerColor }]}>{unfollowLabel}</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

type SkippedRowProps = {
  entry: FollowingCleanupEntry;
  isLast: boolean;
  href: string;
  onUnskip: () => void;
  borderColor: string;
  textColor: string;
  subduedColor: string;
  tintColor: string;
  unskipLabel: string;
};

function SkippedRow({
  entry,
  isLast,
  href,
  onUnskip,
  borderColor,
  textColor,
  subduedColor,
  tintColor,
  unskipLabel,
}: SkippedRowProps) {
  return (
    <View
      style={[
        styles.row,
        !isLast && {
          borderBottomColor: borderColor,
          borderBottomWidth: layout.hairline,
        },
      ]}
    >
      <PressableLink
        href={href}
        accessibilityLabel={entry.profile.handle}
        style={styles.rowLinkArea}
      >
        {entry.profile.avatar ? (
          <Image source={{ uri: entry.profile.avatar }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { borderColor }]}>
            <IconSymbol name="person.fill" size={16} color={subduedColor} />
          </View>
        )}
        <View style={styles.rowText}>
          <ThemedText style={[styles.rowName, { color: textColor }]} numberOfLines={1}>
            {entry.profile.displayName?.trim() || entry.profile.handle}
          </ThemedText>
          <ThemedText style={[styles.rowHandle, { color: subduedColor }]} numberOfLines={1}>
            @{entry.profile.handle}
          </ThemedText>
        </View>
      </PressableLink>
      <Pressable
        onPress={onUnskip}
        accessibilityRole="button"
        accessibilityLabel={unskipLabel}
        hitSlop={hitSlop}
        style={({ pressed }) => [
          styles.actionButton,
          { borderColor: tintColor },
          pressed && { opacity: 0.7 },
        ]}
      >
        <ThemedText style={[styles.actionText, { color: tintColor }]}>{unskipLabel}</ThemedText>
      </Pressable>
    </View>
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
  sectionCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: layout.hairline,
    backgroundColor: 'transparent',
  },
  scanCard: {
    padding: spacing.md,
    gap: spacing.md,
  },
  scanInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  scanInfoText: {
    flex: 1,
  },
  scanTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  scanSubtitle: {
    fontSize: fontSize.sm,
    marginTop: spacing.xxs,
  },
  scanActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scanButton: {
    borderWidth: layout.hairline,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  scanButtonPrimary: {
    flex: 1,
  },
  scanButtonSecondary: {
    paddingHorizontal: spacing.md,
  },
  scanButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  thresholdRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.md,
  },
  thresholdPill: {
    borderWidth: layout.hairline,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  thresholdText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
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
  rowLinkArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    // Min width prevents the PressableLink anchor from collapsing on web
    // when the inner text is set to numberOfLines=1 (truncation).
    minWidth: 0,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  rowHandle: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  rowMeta: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionButton: {
    borderWidth: layout.hairline,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  skippedHelp: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  skippedHelpText: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  skippedClearLink: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  actionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  disabled: {
    opacity: 0.5,
  },
});
