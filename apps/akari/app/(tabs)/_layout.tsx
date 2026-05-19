import { Redirect, Slot, Tabs, usePathname, useRouter, type Href } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { TabKey } from '@/hooks/useTabConfig';
import type { LayoutChangeEvent } from 'react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontSize, layout, opacity, spacing } from '@/constants/tokens';
import { AccountSwitcherSheet } from '@/components/AccountSwitcherSheet';
import { ReportSheet } from '@/components/ReportSheet';
import { RightColumn } from '@/components/RightColumn';
import { Sidebar } from '@/components/Sidebar';
import { ThemedText } from '@/components/ThemedText';
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
import { useTranslation } from '@/hooks/useTranslation';
import { useConversations } from '@/hooks/queries/useConversations';
import { useThemeColor } from '@/hooks/useThemeColor';

/**
 * Native-only large-screen layout (iPad / large Android). Sidebar +
 * Tabs in a flex row. The web variant lives in WebTabLayout below.
 */
function NativeLargeScreenLayout({
  showRightColumn,
}: {
  showRightColumn: boolean;
  headerBorderColor: string;
}) {
  return (
    <ThemedView style={{ flex: 1 }}>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            gap: spacing.lg,
            width: '100%',
            maxWidth: showRightColumn ? 1280 : layout.maxContentWidth,
            minHeight: 0,
          }}
        >
          <Sidebar />
          <View style={{ flex: 1, minHeight: '100%' }}>
            <Tabs
              screenOptions={{
                headerShown: false,
                tabBarStyle: { display: 'none' },
              }}
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

/**
 * Tells screens how much fixed chrome sits above them so any of their
 * own pinned bars (e.g. the home feed's FeedListHeader) can position
 * themselves below it instead of stacking at `top: 0` behind the mobile
 * header. `0` on large screens (no top chrome) and on native.
 */
export const TabChromeContext = React.createContext<{ topInset: number }>({ topInset: 0 });

type WebTabLayoutProps = {
  isLargeScreen: boolean;
  showRightColumn: boolean;
  shouldShowMobileHeader: boolean;
  mobileChrome: React.ReactNode;
  unreadMessagesCount: number;
  unreadNotificationsCount: number;
  avatarUri?: string;
  visibleTabs: TabKey[];
  contentSafeAreaInsets: { top: number; right: number; bottom: number; left: number };
  safeAreaInsetsTop: number;
  accountSwitcher: React.ReactNode;
};

const WEB_TAB_ORDER: TabKey[] = [
  'index',
  'search',
  'messages',
  'notifications',
  'bookmarks',
  'profile',
  'settings',
];

const SIDEBAR_W = 260;
const RIGHT_W = 320;
const CENTER_W = 600;

/**
 * Unified web tab shell — handles both the large-screen sidebar layout
 * and the mobile-screen fixed-header / bottom-tab-bar layout in a
 * single component. Critically, `<Slot />` is rendered at a *stable*
 * position in this component's JSX (keyed `content` below) regardless
 * of `isLargeScreen`, so swapping between viewport sizes only changes
 * the surrounding chrome and the content View's style — it does not
 * unmount the active route's screen. Without that, the search input,
 * scroll position, etc. would reset whenever the user crossed the
 * responsive breakpoint.
 *
 * The route's screen state lives inside `<Slot />`'s subtree, which is
 * preserved across re-renders here because React reconciles by key for
 * the chrome elements (so adding/removing sidebars or mobile bars
 * doesn't shift the content's identity).
 */
function WebTabLayout({
  isLargeScreen,
  showRightColumn,
  shouldShowMobileHeader,
  mobileChrome,
  unreadMessagesCount,
  unreadNotificationsCount,
  avatarUri,
  visibleTabs,
  contentSafeAreaInsets,
  safeAreaInsetsTop,
  accountSwitcher,
}: WebTabLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Page-level scroll on web means the document body keeps its scroll
  // position across navigations — so jumping from a scrolled-down home
  // feed into a profile would land you at the same vertical offset on
  // the new page instead of the top. Reset window scroll whenever the
  // route changes. Browser back/forward restoration is the trade-off;
  // most users expect a fresh page-top on forward navigation.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  const [mobileHeaderHeight, setMobileHeaderHeight] = useState(0);
  const [tabBarHeight, setTabBarHeight] = useState(0);

  const onMobileHeaderLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    setMobileHeaderHeight((prev) => (prev === h ? prev : h));
  }, []);
  const onTabBarLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    setTabBarHeight((prev) => (prev === h ? prev : h));
  }, []);

  // Synthetic state for HardcodedTabBar (mobile bar). Reads
  // state.routes / state.index and calls navigation.navigate(name) /
  // navigation.emit() — nothing else from react-navigation context.
  const { state, navigation } = useMemo(() => {
    const segs = pathname.split('/').filter((s) => s && !s.startsWith('('));
    const top = segs[0] ?? 'index';
    const activeName = WEB_TAB_ORDER.includes(top as TabKey)
      ? (top as TabKey)
      : 'index';
    const routes = WEB_TAB_ORDER.map((name) => ({ key: name, name }));
    const index = routes.findIndex((r) => r.name === activeName);
    return {
      state: {
        routes,
        index: Math.max(0, index),
      } as unknown as BottomTabBarProps['state'],
      navigation: {
        navigate: (name: string) => {
          router.push((name === 'index' ? '/' : `/${name}`) as unknown as Href);
        },
        emit: () => ({ defaultPrevented: false }),
      } as unknown as BottomTabBarProps['navigation'],
    };
  }, [pathname, router]);

  const chromeValue = useMemo(
    () => ({
      topInset: isLargeScreen
        ? 0
        : shouldShowMobileHeader
          ? mobileHeaderHeight
          : safeAreaInsetsTop,
    }),
    [isLargeScreen, shouldShowMobileHeader, mobileHeaderHeight, safeAreaInsetsTop],
  );

  // Sidebar offsets (large screen only). max() keeps them on-screen on
  // narrow large viewports.
  const GAP = spacing.lg;
  const leftSidebarLeft = `max(0px, calc(50vw - ${CENTER_W / 2 + GAP + SIDEBAR_W}px))`;
  const rightSidebarRight = `max(0px, calc(50vw - ${CENTER_W / 2 + GAP + RIGHT_W}px))`;

  return (
    <TabChromeContext.Provider value={chromeValue}>
      <SafeAreaInsetsContext.Provider value={contentSafeAreaInsets}>
        <ThemedView style={({ minHeight: '100vh', overflow: 'visible' } as object)}>
          {isLargeScreen ? (
            <View
              key="left-sidebar"
              style={
                ({
                  position: 'fixed',
                  top: 0,
                  left: leftSidebarLeft,
                  width: SIDEBAR_W,
                  height: '100vh',
                } as object)
              }
            >
              <Sidebar />
            </View>
          ) : null}

          {isLargeScreen && showRightColumn ? (
            <View
              key="right-sidebar"
              style={
                ({
                  position: 'fixed',
                  top: 0,
                  right: rightSidebarRight,
                  width: RIGHT_W,
                  height: '100vh',
                  overflowY: 'auto',
                } as object)
              }
            >
              <RightColumn />
            </View>
          ) : null}

          {!isLargeScreen && shouldShowMobileHeader ? (
            <View
              key="mobile-header"
              onLayout={onMobileHeaderLayout}
              style={
                ({
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 20,
                } as object)
              }
            >
              {mobileChrome}
            </View>
          ) : null}

          {/* Stable-key content View — Slot lives here in every
              variant so the active screen's state survives crossing
              the isLargeScreen breakpoint. Left/right borders here
              (large screen only) so short pages like a single post
              detail still show the column edges; per-component
              borders left gaps wherever the content didn't fill the
              viewport. */}
          <View
            key="content"
            style={
              isLargeScreen
                ? ({
                    width: CENTER_W,
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    minHeight: '100vh',
                    overflow: 'visible',
                  } as object)
                : ({
                    minHeight: '100vh',
                    overflow: 'visible',
                    paddingTop: shouldShowMobileHeader ? mobileHeaderHeight : safeAreaInsetsTop,
                    paddingBottom: tabBarHeight,
                  } as object)
            }
          >
            <Slot />
          </View>

          {!isLargeScreen ? (
            <View
              key="bottom-tab-bar"
              onLayout={onTabBarLayout}
              style={
                ({
                  position: 'fixed',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  zIndex: 20,
                } as object)
              }
            >
              <HardcodedTabBar
                state={state}
                navigation={navigation}
                descriptors={{} as BottomTabBarProps['descriptors']}
                insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
                unreadMessagesCount={unreadMessagesCount}
                unreadNotificationsCount={unreadNotificationsCount}
                avatarUri={avatarUri}
                visibleTabs={visibleTabs}
              />
            </View>
          ) : null}
        </ThemedView>
      </SafeAreaInsetsContext.Provider>
      {accountSwitcher}
    </TabChromeContext.Provider>
  );
}

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
  const { t } = useTranslation();
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
    // Surface what's happening instead of a bare spinner. A slow
    // session refresh (or a backend hiccup like a 502 on the chat
    // listConvos call that hangs auth long enough to be noticed)
    // shouldn't leave the whole app looking dead.
    return (
      <ThemedView
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          gap: spacing.md,
          padding: spacing.lg,
        }}
      >
        <ActivityIndicator size="large" color={accentColor} />
        <ThemedText style={{ fontSize: fontSize.base, opacity: opacity.secondary, textAlign: 'center' }}>
          {t('auth.refreshingSession')}
        </ThemedText>
      </ThemedView>
    );
  }

  // Don't render tabs if not authenticated or still loading
  if (!authStatus?.isAuthenticated) {
    return <Redirect href="/(auth)/signin" />;
  }

  // Mobile chrome (used by web tab layout's mobile branch AND by the
  // native mobile path below).
  const mobileChrome = (
    <>
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
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <WebTabLayout
        isLargeScreen={isLargeScreen}
        showRightColumn={showRightColumn}
        shouldShowMobileHeader={shouldShowMobileHeader}
        mobileChrome={mobileChrome}
        unreadMessagesCount={unreadMessagesCount}
        unreadNotificationsCount={unreadNotificationsCount}
        avatarUri={currentAccount?.avatar}
        visibleTabs={visibleTabs}
        contentSafeAreaInsets={contentSafeAreaInsets}
        safeAreaInsetsTop={safeAreaInsets.top}
        accountSwitcher={
          <AccountSwitcherSheet visible={isAccountSwitcherVisible} onClose={handleCloseAccountSwitcher} />
        }
      />
    );
  }

  // Native large screens: sidebar + Tabs flex row.
  if (isLargeScreen) {
    return (
      <NativeLargeScreenLayout
        showRightColumn={showRightColumn}
        headerBorderColor={headerBorderColor}
      />
    );
  }

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
          {mobileChrome}
          <Tabs
            screenOptions={{
              headerShown: false,
            }}
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
