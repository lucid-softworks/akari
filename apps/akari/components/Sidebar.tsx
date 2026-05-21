import { usePathname, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Image } from '@/components/Image';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, radius, fontSize, fontWeight } from '@/constants/tokens';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { PressableLink } from '@/components/ui/PressableLink';
import { useAccounts } from '@/hooks/queries/useAccounts';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useOzoneMembership } from '@/hooks/queries/useOzoneMembership';
import { useUnreadMessagesCount } from '@/hooks/queries/useUnreadMessagesCount';
import { useUnreadNotificationsCount } from '@/hooks/queries/useUnreadNotificationsCount';
import { type TabKey, useTabConfig } from '@/hooks/useTabConfig';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

const SIDEBAR_WIDTH = 260;

type NavigationItem = {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  route: string;
  webRoute: string;
  badge?: number | null;
};

type SidebarProps = {
  onNavigate?: () => void;
};

export function Sidebar({ onNavigate }: SidebarProps = {}) {
  const { push } = useRouter();
  const pathname = usePathname();
  const { data: accounts = [] } = useAccounts();
  const { data: currentAccount } = useCurrentAccount();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { data: unreadMessagesCount = 0 } = useUnreadMessagesCount();
  const { data: unreadNotificationsCount = 0 } = useUnreadNotificationsCount();

  // Theme colors
  const textPrimary = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const bgColor = useThemeColor({}, 'background');
  const activeBg = useThemeColor({ light: '#F3F4F6', dark: '#2A2D2E' }, 'background');
  const hoverBg = useThemeColor({}, 'hover');
  const accentColor = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'tint');
  const badgeBg = '#FF3B30';
  const activeAccount = currentAccount ?? accounts[0];

  const { data: ozoneMembership } = useOzoneMembership();
  const showModeration = !!ozoneMembership?.isMod;
  const { visibleTabs } = useTabConfig();

  // The sidebar mirrors the user's "Customize Tabs" selection so a tab
  // hidden from the bottom bar also stays hidden here. The map below is
  // the per-TabKey sidebar metadata (outline-style icons, translated
  // labels). Moderation is still gated on Ozone team membership — the
  // tab can be enabled by anyone, but the link only appears when the
  // server confirms moderator access.
  const navigationItems = useMemo<NavigationItem[]>(() => {
    const profileWebRoute = activeAccount?.handle ? `/profile/${activeAccount.handle}` : '/profile';
    const tabMeta: Record<TabKey, Omit<NavigationItem, 'id' | 'badge'>> = {
      index: { label: t('common.home'), icon: 'house', route: '/(tabs)', webRoute: '/' },
      search: { label: t('common.search'), icon: 'magnifyingglass', route: '/(tabs)/search', webRoute: '/search' },
      messages: { label: t('common.messages'), icon: 'message.fill', route: '/(tabs)/messages', webRoute: '/messages' },
      notifications: { label: t('navigation.notifications'), icon: 'bell', route: '/(tabs)/notifications', webRoute: '/notifications' },
      bookmarks: { label: t('common.bookmarks'), icon: 'bookmark.fill', route: '/(tabs)/bookmarks', webRoute: '/bookmarks' },
      profile: { label: t('common.profile'), icon: 'person.fill', route: '/(tabs)/profile', webRoute: profileWebRoute },
      'community-notes': { label: t('communityNotes.title'), icon: 'info.circle.fill', route: '/(tabs)/community-notes', webRoute: '/community-notes' },
      moderation: { label: 'Moderation', icon: 'shield.fill', route: '/(tabs)/moderation', webRoute: '/moderation' },
      settings: { label: t('navigation.settings'), icon: 'gearshape.fill', route: '/(tabs)/settings', webRoute: '/settings' },
    };
    const badgeFor: Partial<Record<TabKey, number>> = {
      notifications: unreadNotificationsCount,
      messages: unreadMessagesCount,
    };
    return visibleTabs
      .filter((key) => key !== 'moderation' || showModeration)
      .map((key) => ({
        id: key,
        ...tabMeta[key],
        badge: badgeFor[key],
      }));
  }, [t, unreadMessagesCount, unreadNotificationsCount, activeAccount?.handle, showModeration, visibleTabs]);

  const isActiveRoute = (item: NavigationItem) => {
    if (item.route === '/(tabs)') {
      return pathname === '/(tabs)' || pathname === '/(tabs)/index';
    }
    return pathname === item.route;
  };

  // Same-path guard so clicking a sidebar item that points at the URL we're
  // already on doesn't queue up a duplicate browser-history entry — otherwise
  // every "Home" press from inside a profile or post lands a redundant entry
  // and the back button has to walk through them all to make progress.
  //
  // Both sides are normalised: the runtime `pathname` from expo-router omits
  // the `(tabs)` route group (so `/(tabs)/profile` shows as `/profile`), and
  // we treat empty / trailing-slash variants of `/` as equivalent.
  const samePath = (target: string) => {
    const normalize = (p: string) =>
      p
        .replace(/\(tabs\)\//g, '')
        .replace(/\/?\(tabs\)\/?$/, '/')
        .replace(/\/+$/, '') || '/';
    return normalize(pathname) === normalize(target);
  };

  const pushIfDifferent = (route: string) => {
    if (samePath(route)) return;
    push(route as any);
  };

  const handleNavigate = (item: NavigationItem) => {
    const target = Platform.OS === 'web' ? item.webRoute : item.route;
    if (!samePath(target)) {
      push(target as any);
    }
    onNavigate?.();
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Navigation */}
      <View style={styles.nav}>
        {navigationItems.map((item) => {
          const active = isActiveRoute(item);
          return (
            <PressableLink
              key={item.id}
              href={Platform.OS === 'web' ? item.webRoute : item.route}
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
              onPress={() => handleNavigate(item)}
              style={[
                styles.navItem,
                { backgroundColor: active ? activeBg : 'transparent' },
              ]}
              hoverStyle={{ backgroundColor: active ? activeBg : hoverBg }}
            >
              <IconSymbol
                name={item.icon}
                size={20}
                color={active ? accentColor : textSecondary}
              />
              <Text
                style={[
                  styles.navLabel,
                  {
                    color: active ? textPrimary : textSecondary,
                    fontWeight: active ? fontWeight.semibold : fontWeight.medium,
                  },
                ]}
              >
                {item.label}
              </Text>
              {item.badge && item.badge > 0 ? (
                <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                  <Text style={styles.badgeText}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </Text>
                </View>
              ) : null}
            </PressableLink>
          );
        })}
      </View>

      {/* Footer: account chip at the very bottom */}
      <View style={styles.footer}>
        <PressableLink
          href={Platform.OS === 'web' ? (activeAccount?.handle ? `/profile/${activeAccount.handle}` : '/profile') : '/(tabs)/profile'}
          onPress={() => pushIfDifferent('/(tabs)/profile')}
          accessibilityLabel="Account"
          style={styles.accountSection}
          hoverStyle={{ backgroundColor: hoverBg }}
        >
          <View style={[styles.avatar, { backgroundColor: accentColor }]}>
            {activeAccount?.avatar ? (
              <Image source={{ uri: activeAccount.avatar }} style={styles.avatarImage} contentFit="cover" />
            ) : (
              <Text style={styles.avatarInitial}>
                {(activeAccount?.displayName || activeAccount?.handle || 'U').charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <View style={styles.accountInfo}>
            <Text style={[styles.displayName, { color: textPrimary }]} numberOfLines={1}>
              {activeAccount?.displayName ?? activeAccount?.handle ?? 'Account'}
            </Text>
            {activeAccount?.handle ? (
              <Text style={[styles.handle, { color: textSecondary }]} numberOfLines={1}>
                @{activeAccount.handle}
              </Text>
            ) : null}
          </View>
        </PressableLink>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIDEBAR_WIDTH,
    flexShrink: 0,
    height: '100%',
  },
  accountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
    borderRadius: radius.sm,
    gap: spacing.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: radius.full,
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  accountInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  handle: {
    fontSize: fontSize.sm,
    marginTop: 1,
  },
  nav: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    gap: spacing.xxs,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    gap: spacing.md,
  },
  navLabel: {
    flex: 1,
    fontSize: fontSize.lg,
  },
  badge: {
    borderRadius: radius.full,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  footer: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
});
