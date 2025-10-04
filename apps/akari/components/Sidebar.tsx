import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AddAccountPanel } from '@/components/AddAccountPanel';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { DialogModal } from '@/components/ui/DialogModal';
import { useDialogManager } from '@/contexts/DialogContext';
import { ADD_ACCOUNT_PANEL_ID } from '@/constants/dialogs';
import { useSwitchAccount } from '@/hooks/mutations/useSwitchAccount';
import { useAccounts } from '@/hooks/queries/useAccounts';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useUnreadMessagesCount } from '@/hooks/queries/useUnreadMessagesCount';
import { useUnreadNotificationsCount } from '@/hooks/queries/useUnreadNotificationsCount';
import { TAB_PATHS, useTabNavigation, type TabRouteKey } from '@/hooks/useTabNavigation';
import { Account } from '@/types/account';

const COLLAPSED_WIDTH = 68;
const EXPANDED_WIDTH = 264;

const palette = {
  background: '#0F1115',
  border: '#1F212D',
  headerBackground: '#151823',
  textPrimary: '#F4F4F5',
  textSecondary: '#A1A1AA',
  textMuted: '#6B7280',
  highlight: '#7C8CF9',
  activeBackground: '#1E2537',
  hover: '#1A1D27',
  countAccent: '#EA580C',
  activeCount: '#7C8CF9',
  trendingAccent: '#38BDF8',
} as const;

const TRENDING_TAGS = [
  '#BlueskyMigration',
  '#DecentralizedSocial',
  '#ATProtocol',
  '#OpenSource',
] as const;

type NavigationItem = {
  id: 'timeline' | 'notifications' | 'messages' | 'discover' | 'bookmarks' | 'profile' | 'settings';
  label: string;
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  route: string;
  badge?: number | null;
};

export function Sidebar() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const { data: accounts = [] } = useAccounts();
  const { data: currentAccount } = useCurrentAccount();
  const switchAccountMutation = useSwitchAccount();
  const dialogManager = useDialogManager();
  const { activeTab } = useTabNavigation();

  const { data: unreadMessagesCount = 0 } = useUnreadMessagesCount();
  const { data: unreadNotificationsCount = 0 } = useUnreadNotificationsCount();

  const navigationItems = useMemo<NavigationItem[]>(
    () => [
      { id: 'timeline', label: 'Timeline', icon: 'house.fill', route: TAB_PATHS.index },
      {
        id: 'notifications',
        label: 'Notifications',
        icon: 'bell.fill',
        route: TAB_PATHS.notifications,
        badge: unreadNotificationsCount,
      },
      {
        id: 'messages',
        label: 'Messages',
        icon: 'message.fill',
        route: TAB_PATHS.messages,
        badge: unreadMessagesCount,
      },
      { id: 'discover', label: 'Discover', icon: 'magnifyingglass', route: TAB_PATHS.search },
      { id: 'bookmarks', label: 'Bookmarks', icon: 'bookmark.fill', route: TAB_PATHS.bookmarks },
      { id: 'profile', label: 'Profile', icon: 'person.fill', route: TAB_PATHS.profile },
      { id: 'settings', label: 'Settings', icon: 'gearshape.fill', route: TAB_PATHS.settings },
    ],
    [unreadMessagesCount, unreadNotificationsCount],
  );

  const activeAccount: Account | undefined = currentAccount ?? accounts[0];

  const getAccountInitial = (account?: Account) => {
    if (!account) {
      return 'U';
    }

    const source = account.displayName || account.handle;
    if (!source) {
      return 'U';
    }

    return source.charAt(0).toUpperCase();
  };

  const routeTabMap: Partial<Record<NavigationItem['id'], TabRouteKey>> = useMemo(
    () => ({
      timeline: 'index',
      notifications: 'notifications',
      messages: 'messages',
      discover: 'search',
      bookmarks: 'bookmarks',
      profile: 'profile',
      settings: 'settings',
    }),
    [],
  );

  const isActiveRoute = (item: NavigationItem) => {
    const tabKey = routeTabMap[item.id];
    return tabKey ? activeTab === tabKey : false;
  };

  const handleNavigate = (item: NavigationItem) => {
    setShowAccountSelector(false);
    router.push(item.route as any);
  };

  const handleAccountSelect = (account: Account) => {
    setShowAccountSelector(false);

    if (!account || account.did === currentAccount?.did) {
      return;
    }

    switchAccountMutation.mutate(account);
  };

  const handleAddAccount = () => {
    setShowAccountSelector(false);
    const closePanel = () => dialogManager.close(ADD_ACCOUNT_PANEL_ID);
    dialogManager.open({
      id: ADD_ACCOUNT_PANEL_ID,
      component: (
        <DialogModal onRequestClose={closePanel}>
          <AddAccountPanel panelId={ADD_ACCOUNT_PANEL_ID} />
        </DialogModal>
      ),
    });
  };

  const renderBadge = (count: number | null | undefined, isActive: boolean, collapsedState: boolean) => {
    if (!count || count <= 0) {
      return null;
    }

    if (collapsedState) {
      return (
        <View style={styles.collapsedBadge} pointerEvents="none">
          <Text style={styles.collapsedBadgeText}>{count}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.badge, { backgroundColor: isActive ? palette.activeCount : palette.countAccent }]} pointerEvents="none">
        <Text style={styles.badgeText}>{count}</Text>
      </View>
    );
  };

  const renderNavigationIcon = (item: NavigationItem, isActive: boolean) => {
    if (item.id !== 'profile') {
      return (
        <IconSymbol
          name={item.icon}
          size={18}
          color={isActive ? palette.highlight : palette.textSecondary}
        />
      );
    }

    const avatarUri = activeAccount?.avatar;
    const showInitial = !avatarUri;

    return (
      <View
        style={[
          styles.profileNavIcon,
          isActive ? styles.profileNavIconActive : null,
          showInitial ? (isActive ? styles.profileNavIconFallbackActive : styles.profileNavIconFallback) : null,
        ]}
      >
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.profileNavIconImage} contentFit="cover" />
        ) : (
          <Text style={styles.profileNavIconInitial}>{getAccountInitial(activeAccount)}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open account switcher"
          onPress={() => setShowAccountSelector((value) => !value)}
          style={({ pressed }) => [
            styles.accountButton,
            collapsed && styles.accountButtonCollapsed,
            pressed && { backgroundColor: palette.hover },
          ]}
        >
          <View style={styles.avatar}>
            {activeAccount?.avatar ? (
              <Image source={{ uri: activeAccount.avatar }} style={styles.avatarImage} contentFit="cover" />
            ) : (
              <Text style={styles.avatarText}>{getAccountInitial(activeAccount)}</Text>
            )}
          </View>
          {!collapsed ? (
            <View style={styles.accountTextContainer}>
              <Text style={styles.accountName} numberOfLines={1}>
                {activeAccount?.displayName ?? activeAccount?.handle ?? 'Add account'}
              </Text>
              {activeAccount?.handle ? (
                <Text style={styles.accountHandle}>@{activeAccount.handle}</Text>
              ) : null}
            </View>
          ) : null}
          {!collapsed ? (
            <IconSymbol name="chevron.down" size={16} color={palette.textSecondary} />
          ) : null}
        </Pressable>
      </View>

      <View style={styles.menu}>
        <View style={styles.navigationList}>
          {navigationItems.map((item) => {
            const active = isActiveRoute(item);
            return (
              <Pressable
                key={item.id}
                accessibilityLabel={item.label}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => handleNavigate(item)}
                style={({ pressed }) => [
                  styles.navItem,
                  collapsed && styles.navItemCollapsed,
                  {
                    backgroundColor: active
                      ? palette.activeBackground
                      : pressed
                      ? palette.hover
                      : 'transparent',
                  },
                ]}
              >
                {active ? <View style={styles.activeIndicator} /> : null}
                <View style={[styles.iconContainer, collapsed && styles.iconCollapsedSpacing]}>
                  {renderNavigationIcon(item, active)}
                </View>
                {!collapsed ? (
                  <>
                    <Text
                      style={[
                        styles.navLabel,
                        {
                          color: active ? palette.highlight : palette.textSecondary,
                          fontWeight: active ? '600' : '500',
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {renderBadge(item.badge, active, false)}
                  </>
                ) : null}
                {collapsed ? renderBadge(item.badge, active, true) : null}
              </Pressable>
            );
          })}
        </View>

        {!collapsed ? (
          <View style={styles.trendingSection}>
            <View style={styles.trendingHeader}>
              <IconSymbol name="sparkles" size={14} color={palette.trendingAccent} />
              <Text style={styles.trendingLabel}>Trending</Text>
            </View>
            <View>
              {TRENDING_TAGS.map((tag) => (
                <Pressable
                  key={tag}
                  accessibilityRole="button"
                  accessibilityLabel={tag}
                  style={({ pressed }) => [
                    styles.trendingItem,
                    pressed && { backgroundColor: palette.hover },
                  ]}
                >
                  <Text style={styles.trendingText}>{tag}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onPress={() => setCollapsed((value) => !value)}
          style={({ pressed }) => [
            styles.collapseButton,
            pressed && { backgroundColor: palette.hover },
          ]}
        >
          {!collapsed ? <Text style={styles.collapseText}>Collapse</Text> : null}
          <IconSymbol name="ellipsis" size={18} color={palette.textSecondary} />
        </Pressable>
      </View>

      {showAccountSelector ? (
        <View
          style={[
            styles.accountSelector,
            collapsed && styles.accountSelectorCollapsed,
          ]}
        >
          <View style={styles.accountSelectorList}>
              {accounts.map((account) => {
                const selected = account.did === activeAccount?.did;
              return (
                <Pressable
                  key={account.did}
                  accessibilityRole="button"
                  accessibilityLabel={`Switch to ${account.displayName ?? account.handle ?? 'account'}`}
                  onPress={() => handleAccountSelect(account)}
                  style={({ pressed }) => [
                    styles.accountOption,
                    (selected || pressed) && { backgroundColor: palette.activeBackground },
                  ]}
                >
                  <View style={styles.avatarSmall}>
                    {account.avatar ? (
                      <Image source={{ uri: account.avatar }} style={styles.avatarImage} contentFit="cover" />
                    ) : (
                      <Text style={styles.avatarText}>{getAccountInitial(account)}</Text>
                    )}
                  </View>
                  {!collapsed ? (
                    <View style={styles.accountDetails}>
                      <Text style={styles.accountDisplay} numberOfLines={1}>
                        {account.displayName ?? account.handle}
                      </Text>
                      {account.handle ? (
                        <Text style={styles.accountUsername}>@{account.handle}</Text>
                      ) : null}
                    </View>
                  ) : null}
                  {selected ? <View style={styles.accountActiveDot} /> : null}
                </Pressable>
              );
            })}
          </View>
          <View style={styles.accountSelectorFooter}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add account"
              onPress={handleAddAccount}
              style={({ pressed }) => [
                styles.addAccountButton,
                pressed && { backgroundColor: palette.hover },
              ]}
            >
              <Text style={styles.addAccountText}>+ Add account</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.background,
    borderColor: palette.border,
    borderWidth: 1,
    flexShrink: 0,
    height: '100%',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.headerBackground,
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  accountButtonCollapsed: {
    justifyContent: 'center',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: palette.highlight,
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: palette.highlight,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 14,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  accountTextContainer: {
    flex: 1,
  },
  accountName: {
    color: palette.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  accountHandle: {
    color: palette.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  menu: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  navigationList: {
    flexGrow: 1,
  },
  navItem: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  navItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  iconContainer: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconCollapsedSpacing: {
    marginRight: 0,
  },
  profileNavIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileNavIconActive: {
    borderColor: palette.highlight,
  },
  profileNavIconFallback: {
    backgroundColor: palette.hover,
  },
  profileNavIconFallbackActive: {
    backgroundColor: palette.highlight,
  },
  profileNavIconImage: {
    width: '100%',
    height: '100%',
  },
  profileNavIconInitial: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  navLabel: {
    flex: 1,
    fontSize: 14,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  collapsedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: palette.countAccent,
    borderRadius: 999,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  collapsedBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 4,
    bottom: 4,
    width: 3,
    backgroundColor: palette.highlight,
  },
  trendingSection: {
    borderTopWidth: 1,
    borderColor: palette.border,
    marginTop: 12,
    paddingTop: 12,
  },
  trendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendingLabel: {
    color: palette.textMuted,
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '600',
  },
  trendingItem: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  trendingText: {
    color: palette.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    borderTopWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: palette.headerBackground,
  },
  collapseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  collapseText: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginRight: 8,
  },
  accountSelector: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 88,
    backgroundColor: palette.headerBackground,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 18 },
    elevation: 16,
    padding: 8,
  },
  accountSelectorCollapsed: {
    left: 8,
    right: 8,
  },
  accountSelectorList: {
    paddingBottom: 8,
  },
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  accountDetails: {
    flex: 1,
  },
  accountDisplay: {
    color: palette.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  accountUsername: {
    color: palette.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  accountActiveDot: {
    width: 8,
    height: 8,
    backgroundColor: palette.highlight,
    marginLeft: 12,
  },
  accountSelectorFooter: {
    borderTopWidth: 1,
    borderColor: palette.border,
    paddingTop: 8,
  },
  addAccountButton: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  addAccountText: {
    color: palette.highlight,
    fontSize: 13,
    fontWeight: '600',
  },
});
