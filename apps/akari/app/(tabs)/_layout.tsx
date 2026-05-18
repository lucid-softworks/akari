import { Redirect, Tabs, usePathname, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, spacing } from '@/constants/tokens';
import { AccountSwitcherSheet } from '@/components/AccountSwitcherSheet';
import { ReportSheet } from '@/components/ReportSheet';
import { RightColumn } from '@/components/RightColumn';
import { Sidebar } from '@/components/Sidebar';
import { ThemedView } from '@/components/ThemedView';
import { ChatActionsSheet } from '@/components/chat/ChatActionsSheet';
import { HardcodedTabBar } from '@/components/tabs/HardcodedTabBar';
import { MobileTabHeader } from '@/components/tabs/MobileTabHeader';
import { useAuthStatus } from '@/hooks/queries/useAuthStatus';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useUnreadMessagesCount } from '@/hooks/queries/useUnreadMessagesCount';
import { useUnreadNotificationsCount } from '@/hooks/queries/useUnreadNotificationsCount';
import { useBorderColor } from '@/hooks/useBorderColor';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useResponsive } from '@/hooks/useResponsive';
import { useTabConfig } from '@/hooks/useTabConfig';
import { useConversations } from '@/hooks/queries/useConversations';
import { useThemeColor } from '@/hooks/useThemeColor';

const headerTitles: Record<string, string> = {
  index: 'Home',
  search: 'Search',
  messages: 'Messages',
  notifications: 'Notifications',
  profile: 'Profile',
  settings: 'Settings',
  bookmarks: 'Bookmarks',
  post: 'Post',
  // Messages sub-pages
  pending: 'Pending Messages',
  'add-account': 'Add Account',
  // Settings sub-pages
  account: 'Account',
  'customize-tabs': 'Customize Tabs',
  'privacy-and-security': 'Privacy & Security',
  moderation: 'Moderation',
  'content-and-media': 'Content & Media',
  appearance: 'Appearance',
  accessibility: 'Accessibility',
  languages: 'Languages',
  about: 'About',
  development: 'Development',
};

export default function TabLayout() {
  const { isLargeScreen, isDesktop } = useResponsive();
  const showRightColumn = isDesktop && Platform.OS === 'web';
  const { visibleTabs } = useTabConfig();
  const { data: authStatus, isLoading } = useAuthStatus();
  const { data: currentAccount } = useCurrentAccount();
  const { data: unreadMessagesCount = 0 } = useUnreadMessagesCount();
  const { data: unreadNotificationsCount = 0 } = useUnreadNotificationsCount();
  const [isAccountSwitcherVisible, setAccountSwitcherVisible] = useState(false);
  const [chatActionsSheetVisible, setChatActionsSheetVisible] = useState(false);
  const [chatReportSheetVisible, setChatReportSheetVisible] = useState(false);
  const safeAreaInsets = useSafeAreaInsets();
  const pathname = usePathname();
  const { back } = useRouter();
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const headerBackground = useThemeColor({}, 'background');
  const headerIconColor = useThemeColor({ light: '#111827', dark: '#F9FAFB' }, 'text');
  const headerBorderColor = useBorderColor();
  const headerTextColor = headerIconColor;

  const { currentTabKey, isNestedRoute, nestedRouteKey } = useMemo(() => {
    if (!pathname) {
      return { currentTabKey: 'index', isNestedRoute: false, nestedRouteKey: undefined };
    }

    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) {
      return { currentTabKey: 'index', isNestedRoute: false, nestedRouteKey: undefined };
    }

    const nonGroupSegments = segments.filter((segment) => !segment.startsWith('('));
    const firstNonGroupSegment = nonGroupSegments[0] ?? 'index';
    const nested = nonGroupSegments.length > 1;
    // Find the last segment that matches a known route name in headerTitles
    let resolvedNestedKey: string | undefined;
    if (nested) {
      for (let i = nonGroupSegments.length - 1; i >= 1; i--) {
        if (headerTitles[nonGroupSegments[i]]) {
          resolvedNestedKey = nonGroupSegments[i];
          break;
        }
      }
      // Fall back to last segment if no match found
      resolvedNestedKey ??= nonGroupSegments[nonGroupSegments.length - 1];
    }
    return {
      currentTabKey: firstNonGroupSegment,
      isNestedRoute: nested,
      nestedRouteKey: resolvedNestedKey,
    };
  }, [pathname]);

  // For message threads, show avatar + name in header
  const isMessageThread = currentTabKey === 'messages' && isNestedRoute && nestedRouteKey !== 'pending';
  const { data: conversationsData } = useConversations();
  const messageThreadConvo = isMessageThread && nestedRouteKey
    ? (() => {
        const decoded = decodeURIComponent(nestedRouteKey);
        const convos = conversationsData?.pages?.flatMap((p) => p.conversations) ?? [];
        // Route is now convoId-keyed; fall back to handle for any legacy
        // links / push notifications still using the old [handle] form.
        return convos.find((c) => c.convoId === decoded) ?? convos.find((c) => c.handle === decoded);
      })()
    : undefined;

  const headerTitle = isMessageThread
    ? ''
    : isNestedRoute
      ? (headerTitles[nestedRouteKey ?? ''] ?? headerTitles[currentTabKey] ?? 'Akari')
      : (headerTitles[currentTabKey] ?? 'Akari');
  const shouldShowMobileHeader = currentTabKey !== 'profile';

  // Set browser tab title on web
  useEffect(() => {
    if (Platform.OS === 'web') {
      let title = headerTitle || 'Akari';
      // For profile routes, show the handle instead of "Profile"
      if (currentTabKey === 'profile' && pathname) {
        const segments = pathname.split('/').filter(Boolean);
        const handleSegment = segments.find((s) => s !== 'profile' && !s.startsWith('('));
        if (handleSegment) {
          title = `@${decodeURIComponent(handleSegment)}`;
        }
      }
      document.title = `${title} — Akari`;
    }
  }, [headerTitle, currentTabKey, pathname]);

  const handleOpenAccountSwitcher = useCallback(() => {
    if (isLargeScreen) {
      return;
    }

    setAccountSwitcherVisible(true);
  }, [isLargeScreen]);

  const handleCloseAccountSwitcher = useCallback(() => {
    setAccountSwitcherVisible(false);
  }, []);


  // Initialize push notifications
  usePushNotifications();

  const contentSafeAreaInsets = useMemo(
    () => ({
      top: shouldShowMobileHeader ? 0 : safeAreaInsets.top,
      right: safeAreaInsets.right,
      bottom: safeAreaInsets.bottom,
      left: safeAreaInsets.left,
    }),
    [safeAreaInsets.bottom, safeAreaInsets.left, safeAreaInsets.right, safeAreaInsets.top, shouldShowMobileHeader],
  );

  if (isLoading || !authStatus) {
    return (
      <ThemedView
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color={accentColor} />
      </ThemedView>
    );
  }

  // Don't render tabs if not authenticated or still loading
  if (!authStatus?.isAuthenticated) {
    return <Redirect href="/(auth)/signin" />;
  }

  // For large screens, show tabs without the tab bar
  if (isLargeScreen) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.lg,
              width: '100%',
              maxWidth: showRightColumn ? 1280 : layout.maxContentWidth,
              minHeight: '100%',
            }}
          >
            <Sidebar />
            <View
              style={
                Platform.OS === 'web'
                  ? {
                      width: 600,
                      maxWidth: 600,
                      flexShrink: 0,
                      minHeight: '100%',
                      borderLeftWidth: 1,
                      borderRightWidth: 1,
                      borderColor: headerBorderColor,
                    }
                  : {
                      flex: 1,
                      minHeight: '100%',
                    }
              }
            >
              <Tabs
                screenOptions={{
                  headerShown: false,
                  tabBarStyle: { display: 'none' },
                }}
                backBehavior={Platform.OS === 'web' ? 'history' : undefined}
              >
                <Tabs.Screen name="index" />
                <Tabs.Screen name="search" />
                <Tabs.Screen name="messages" />
                <Tabs.Screen name="notifications" />
                <Tabs.Screen name="bookmarks" options={{ href: null }} />
                <Tabs.Screen name="profile" />
                <Tabs.Screen name="settings" />
              </Tabs>
            </View>
            {showRightColumn ? <RightColumn /> : null}
          </View>
        </View>
      </ThemedView>
    );
  }

  // For mobile screens, show the traditional tab bar (no drawer)
  return (
    <>
      <SafeAreaInsetsContext.Provider value={contentSafeAreaInsets}>
        <View
          style={[
            { flex: 1 },
            shouldShowMobileHeader
              ? null
              : { paddingTop: safeAreaInsets.top },
          ]}
        >
          {shouldShowMobileHeader ? (
            <MobileTabHeader
              headerTitle={headerTitle}
              isNestedRoute={isNestedRoute}
              isMessageThread={isMessageThread}
              messageThreadConvo={messageThreadConvo}
              safeAreaTop={safeAreaInsets.top}
              headerBackground={headerBackground}
              headerBorderColor={headerBorderColor}
              headerIconColor={headerIconColor}
              headerTextColor={headerTextColor}
              onBackPress={() => back()}
              onChatOptionsPress={() => setChatActionsSheetVisible(true)}
            />
          ) : null}

          {messageThreadConvo ? (
            <>
              <ChatActionsSheet
                visible={chatActionsSheetVisible}
                onDismiss={() => setChatActionsSheetVisible(false)}
                convoId={messageThreadConvo.convoId}
                isMuted={messageThreadConvo.muted}
                isGroup={messageThreadConvo.isGroup}
                peerDid={messageThreadConvo.isGroup ? undefined : messageThreadConvo.members[0]?.did}
                onReportPress={() => setChatReportSheetVisible(true)}
                onLeft={() => back()}
              />
              {!messageThreadConvo.isGroup && messageThreadConvo.members[0]?.did ? (
                <ReportSheet
                  visible={chatReportSheetVisible}
                  onDismiss={() => setChatReportSheetVisible(false)}
                  subject={{ type: 'account', did: messageThreadConvo.members[0].did }}
                />
              ) : null}
            </>
          ) : null}
          <Tabs
            screenOptions={{
              headerShown: false,
            }}
            backBehavior={Platform.OS === 'web' ? 'history' : undefined}
            tabBar={(props) => (
              <HardcodedTabBar
                {...props}
                unreadMessagesCount={unreadMessagesCount}
                unreadNotificationsCount={unreadNotificationsCount}
                avatarUri={currentAccount?.avatar}
                visibleTabs={visibleTabs}
              />
            )}
          >
            <Tabs.Screen name="index" />
            <Tabs.Screen name="search" />
            <Tabs.Screen name="messages" />
            <Tabs.Screen name="notifications" />
            <Tabs.Screen name="bookmarks" />
            <Tabs.Screen
              name="profile"
              listeners={() => ({
                tabLongPress: () => {
                  handleOpenAccountSwitcher();
                },
              })}
            />
            <Tabs.Screen name="settings" />
          </Tabs>
        </View>
      </SafeAreaInsetsContext.Provider>
      <AccountSwitcherSheet visible={isAccountSwitcherVisible} onClose={handleCloseAccountSwitcher} />
    </>
  );
}
