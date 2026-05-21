import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { webScreenContainer } from '@/constants/webStyles';

import type { WebPortalAnchorRect } from '@/components/post/WebPortalDropdown';
import { ProfileTabs } from '@/components/ProfileTabs';
import { ProfileActionSheets } from '@/components/ProfileView/ProfileActionSheets';
import { ProfileTabPane } from '@/components/ProfileView/ProfileTabPane';
import { ProfileViewHeader } from '@/components/ProfileView/ProfileViewHeader';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ProfileHeaderSkeleton } from '@/components/skeletons';
import { fontSize, fontWeight, semanticColors, spacing } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { germButtonVisibleFor, useGermDeclaration } from '@/hooks/queries/useGermDeclaration';
import { useProfile } from '@/hooks/queries/useProfile';
import { queryKeys } from '@/hooks/queryKeys';
import { useProfileDropdownActions } from '@/hooks/useProfileDropdownActions';
import { useTranslation } from '@/hooks/useTranslation';
import type { ProfileTabType } from '@/types/profile';

type ProfileViewProps = {
  handle: string;
};

const TAB_ORDER: ProfileTabType[] = [
  'posts',
  'replies',
  'reposts',
  'resume',
  'likes',
  'media',
  'videos',
  'photos',
  'rpgItems',
  'feeds',
  'repos',
  'starterpacks',
  'recipes',
  'links',
];

export default function ProfileView({ handle }: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<ProfileTabType>('posts');
  const [visitedTabs, setVisitedTabs] = useState<Set<ProfileTabType>>(() => new Set(['posts']));
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownAnchorRect, setDropdownAnchorRect] = useState<WebPortalAnchorRect | null>(null);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [showListPicker, setShowListPicker] = useState(false);
  const dropdownRef = useRef<View | null>(null);

  // The header passes `(isOpen, rect?)`; capture both so the
  // portaled web menu can anchor next to the `…` trigger.
  const handleDropdownToggle = useCallback(
    (isOpen: boolean, rect?: WebPortalAnchorRect) => {
      setShowDropdown(isOpen);
      setDropdownAnchorRect(isOpen ? rect ?? null : null);
    },
    [],
  );
  // Track the active tab's scroll position + measured header height so the
  // next tab can preserve the user's vertical position (banner-visible vs
  // sticky-tabs-pinned) instead of jumping to the top or hiding the banner.
  const lastScrollYRef = useRef(0);
  const lastHeaderHeightRef = useRef(0);
  const nextTabPinScrollYRef = useRef(0);

  const handleScrollY = useCallback((y: number) => {
    lastScrollYRef.current = y;
  }, []);

  const handleHeaderHeightChange = useCallback((h: number) => {
    lastHeaderHeightRef.current = h;
  }, []);

  const handleTabChange = useCallback((tab: ProfileTabType) => {
    setActiveTab((current) => {
      if (current !== tab) {
        const headerH = lastHeaderHeightRef.current;
        const target = headerH > 0 ? Math.min(lastScrollYRef.current, headerH) : 0;
        nextTabPinScrollYRef.current = Math.max(0, target);
      }
      return tab;
    });
    setVisitedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  }, []);

  const { t } = useTranslation();
  const { data: currentUser } = useCurrentAccount();

  const { data: profile, isLoading, error, refetch: refetchProfile } = useProfile(handle);
  const isOwnProfile = currentUser?.handle === profile?.handle;
  const queryClient = useQueryClient();

  const handleProfileRefresh = useCallback(async () => {
    const refreshed = await refetchProfile();
    const did = refreshed.data?.did ?? profile?.did;
    if (did) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.verifiersForDid(did) });
    }
  }, [refetchProfile, queryClient, profile?.did]);

  const dropdownActions = useProfileDropdownActions({
    profile,
    setShowDropdown,
    setShowReportSheet,
    setShowListPicker,
  });

  const headerComponent = profile ? (
    <ProfileViewHeader
      profile={profile}
      isOwnProfile={isOwnProfile}
      onDropdownToggle={handleDropdownToggle}
      dropdownRef={dropdownRef}
    />
  ) : null;

  const tabsComponent = profile ? (
    <ProfileTabs activeTab={activeTab} onTabChange={handleTabChange} profileHandle={profile.handle} />
  ) : null;

  // Germ Network message-me — both viewer and target must have published a
  // `com.germnetwork.declaration/self` record, and the target's
  // `messageMe.showButtonTo` audience must permit the current viewer. These
  // hooks MUST sit above any early return so React sees the same hook order
  // every render.
  const viewerDid = currentUser?.did;
  const { data: targetGerm } = useGermDeclaration(!isOwnProfile ? profile?.did : undefined);
  const { data: viewerGerm } = useGermDeclaration(!isOwnProfile ? viewerDid : undefined);
  const handleMessageOnGerm = useMemo(() => {
    if (isOwnProfile) return undefined;
    if (!profile?.did || !viewerDid) return undefined;
    if (!targetGerm || !viewerGerm) return undefined;
    const allowed = germButtonVisibleFor(
      targetGerm.messageMe?.showButtonTo,
      Boolean(profile.viewer?.followedBy),
      Boolean(profile.viewer?.following),
    );
    if (!allowed) return undefined;
    const baseUrl =
      targetGerm.messageMe?.messageMeUrl?.replace(/\/$/, '') ?? 'https://landing.ger.mx/newUser';
    return () => {
      setShowDropdown(false);
      void Linking.openURL(`${baseUrl}/web/#${profile.did}+${viewerDid}`);
    };
  }, [isOwnProfile, profile?.did, profile?.viewer, targetGerm, viewerDid, viewerGerm]);

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ProfileHeaderSkeleton />
      </ThemedView>
    );
  }

  if (error || !profile) {
    // Suspended accounts come back with a 4xx + `error: 'AccountTakedown'`
    // body. The XRPC client surfaces those as Error objects with a
    // `.errorCode` property — fall through to the suspended UI rather
    // than the generic "not found" screen so the user understands the
    // account hasn't been deleted, it's been actioned by moderation.
    const errorCode = (error as { errorCode?: string } | null | undefined)?.errorCode;
    if (errorCode === 'AccountTakedown') {
      return <SuspendedAccountState handle={handle} />;
    }
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.errorText}>{t('common.noProfile')}</ThemedText>
      </ThemedView>
    );
  }

  const sharedTabProps = {
    handle,
    ListHeaderComponent: headerComponent,
    StickyTabComponent: tabsComponent,
    pinScrollY: nextTabPinScrollYRef.current,
    onProfileRefresh: handleProfileRefresh,
    onScrollY: handleScrollY,
    onHeaderHeightChange: handleHeaderHeightChange,
  };

  // When the relationship is blocked in either direction, the post-feed
  // queries would either 4xx or return empty pages — skip them entirely
  // and just show the profile header (which already explains the
  // relationship via its own blocked banner).
  const isBlockedRelationship =
    !!profile?.viewer?.blockedBy || !!profile?.viewer?.blocking;

  if (isBlockedRelationship) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.blockedScroll}>{headerComponent}</ScrollView>

        <ProfileActionSheets
          profile={profile}
          isOwnProfile={isOwnProfile}
          visibility={{ dropdown: showDropdown, reportSheet: showReportSheet }}
          dropdownAnchorRect={dropdownAnchorRect}
          onDismissDropdown={() => setShowDropdown(false)}
          onDismissReportSheet={() => setShowReportSheet(false)}
          onCopyLink={dropdownActions.handleCopyLink}
          onSearchPosts={dropdownActions.handleSearchPosts}
          onAddToLists={dropdownActions.handleAddToLists}
          onMuteAccount={dropdownActions.handleMuteAccount}
          onBlockPress={dropdownActions.handleBlockPress}
          onReportAccount={dropdownActions.handleReportAccount}
          onMessageOnGerm={handleMessageOnGerm}
        />
      </ThemedView>
    );
  }

  const isWeb = Platform.OS === 'web';

  // On web the page itself scrolls — only the active tab is mounted in
  // flow, so the document body grows to fit its content and the chrome
  // header + sticky tabs strip can pin to the viewport.
  // On native, all visited tabs stay mounted in absolute-fill panes so
  // switching is instant (and each tab's FlatList preserves its own
  // scroll position).
  return (
    <ThemedView style={isWeb ? webScreenContainer : styles.container}>
      {handle
        ? isWeb
          ? <ProfileTabPane tab={activeTab} isActive sharedProps={sharedTabProps} />
          : TAB_ORDER.map((tab) => {
              if (!visitedTabs.has(tab)) return null;
              const isActive = tab === activeTab;
              return (
                <View
                  key={tab}
                  style={[styles.tabPane, !isActive && styles.tabPaneHidden]}
                  pointerEvents={isActive ? 'auto' : 'none'}
                >
                  <ProfileTabPane tab={tab} isActive={isActive} sharedProps={sharedTabProps} />
                </View>
              );
            })
        : null}

      <ProfileActionSheets
        profile={profile}
        isOwnProfile={isOwnProfile}
        visibility={{
          dropdown: showDropdown,
          reportSheet: showReportSheet,
          listPicker: showListPicker,
        }}
        dropdownAnchorRect={dropdownAnchorRect}
        onDismissDropdown={() => setShowDropdown(false)}
        onDismissReportSheet={() => setShowReportSheet(false)}
        onDismissListPicker={() => setShowListPicker(false)}
        onCopyLink={dropdownActions.handleCopyLink}
        onSearchPosts={dropdownActions.handleSearchPosts}
        onAddToLists={dropdownActions.handleAddToLists}
        onMuteAccount={dropdownActions.handleMuteAccount}
        onBlockPress={dropdownActions.handleBlockPress}
        onReportAccount={dropdownActions.handleReportAccount}
        onMessageOnGerm={handleMessageOnGerm}
      />
    </ThemedView>
  );
}

function SuspendedAccountState({ handle }: { handle: string }) {
  const { t } = useTranslation();
  const panelColor = useThemeColor({}, 'panel');
  const lineSoft = useThemeColor({}, 'lineSoft');
  const textPrimary = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  return (
    <ThemedView style={styles.container}>
      <View style={styles.suspendedWrap}>
        <View style={[styles.suspendedIcon, { backgroundColor: panelColor, borderColor: lineSoft }]}>
          <IconSymbol name="exclamationmark.triangle" size={32} color={semanticColors.danger} />
        </View>
        <ThemedText style={[styles.suspendedTitle, { color: textPrimary }]}>
          {t('profile.suspendedTitle')}
        </ThemedText>
        <ThemedText style={[styles.suspendedBody, { color: textSecondary }]}>
          {t('profile.suspendedBody', { handle })}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabPane: {
    ...StyleSheet.absoluteFillObject,
  },
  tabPaneHidden: {
    opacity: 0,
    zIndex: -1,
  },
  blockedScroll: {
    paddingBottom: spacing.xxl,
  },
  errorText: {
    fontSize: fontSize.lg,
    textAlign: 'center',
    marginTop: spacing.xxxxl,
    color: 'red',
  },
  suspendedWrap: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxxl,
    gap: spacing.md,
  },
  suspendedIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suspendedTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  suspendedBody: {
    fontSize: fontSize.base,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
});
