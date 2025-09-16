import { usePathname, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useUnreadMessagesCount } from '@/hooks/queries/useUnreadMessagesCount';
import { useUnreadNotificationsCount } from '@/hooks/queries/useUnreadNotificationsCount';
import { IconSymbol } from '@/components/ui/IconSymbol';

const COLLAPSED_WIDTH = 68;
const EXPANDED_WIDTH = 264;

const palette = {
  background: '#171717',
  border: '#3F3F46',
  headerBackground: '#262626',
  textPrimary: '#E5E5E5',
  textSecondary: '#A3A3A3',
  textMuted: '#737373',
  highlight: '#2563EB',
  highlightSoft: 'rgba(37, 99, 235, 0.18)',
  hover: '#27272A',
  countAccent: '#EA580C',
  activeCount: '#2563EB',
  trendingAccent: '#22C55E',
  overlay: 'rgba(0, 0, 0, 0.5)',
  inputBackground: '#1F1F1F',
} as const;

const TRENDING_TAGS = [
  '#BlueskyMigration',
  '#DecentralizedSocial',
  '#ATProtocol',
  '#OpenSource',
] as const;

type NavigationItem = {
  id: 'timeline' | 'notifications' | 'messages' | 'discover' | 'bookmarks' | 'settings';
  label: string;
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  route: string;
  badge?: number | null;
};

type Account = {
  username: string;
  displayName: string;
  avatar: string;
  active: boolean;
};

const INITIAL_ACCOUNTS: Account[] = [
  { username: 'alice.bsky.social', displayName: 'Alice Chen', avatar: '👩‍💻', active: true },
  { username: 'alice-work.bsky.social', displayName: 'Alice (Work)', avatar: '💼', active: false },
  { username: 'alice-art.bsky.social', displayName: 'Alice Art', avatar: '🎨', active: false },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>(INITIAL_ACCOUNTS);
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);

  const { data: unreadMessagesCount = 0 } = useUnreadMessagesCount();
  const { data: unreadNotificationsCount = 0 } = useUnreadNotificationsCount();

  const navigationItems = useMemo<NavigationItem[]>(
    () => [
      { id: 'timeline', label: 'Timeline', icon: 'house.fill', route: '/(tabs)' },
      {
        id: 'notifications',
        label: 'Notifications',
        icon: 'bell.fill',
        route: '/(tabs)/notifications',
        badge: unreadNotificationsCount,
      },
      {
        id: 'messages',
        label: 'Messages',
        icon: 'message.fill',
        route: '/(tabs)/messages',
        badge: unreadMessagesCount,
      },
      { id: 'discover', label: 'Discover', icon: 'magnifyingglass', route: '/(tabs)/search' },
      { id: 'bookmarks', label: 'Bookmarks', icon: 'bookmark.fill', route: '/(tabs)/profile' },
      { id: 'settings', label: 'Settings', icon: 'gearshape.fill', route: '/(tabs)/settings' },
    ],
    [unreadMessagesCount, unreadNotificationsCount],
  );

  const activeAccount = accounts.find((account) => account.active) ?? accounts[0];

  const isActiveRoute = (item: NavigationItem) => {
    if (item.route === '/(tabs)') {
      return pathname === '/(tabs)' || pathname === '/(tabs)/index';
    }

    return pathname === item.route;
  };

  const handleNavigate = (item: NavigationItem) => {
    setShowAccountSelector(false);
    router.push(item.route as any);
  };

  const handleAccountSelect = (username: string) => {
    setAccounts((previous) =>
      previous.map((account) => ({
        ...account,
        active: account.username === username,
      })),
    );
    setShowAccountSelector(false);
  };

  const handleAddAccount = () => {
    setShowAccountSelector(false);
    setShowAddAccountModal(true);
  };

  const closeModal = () => {
    setShowAddAccountModal(false);
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
            <Text style={styles.avatarText}>{activeAccount.avatar}</Text>
          </View>
          {!collapsed ? (
            <View style={styles.accountTextContainer}>
              <Text style={styles.accountName}>{activeAccount.displayName}</Text>
              <Text style={styles.accountHandle}>@{activeAccount.username.split('.')[0]}</Text>
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
                      ? palette.highlightSoft
                      : pressed
                      ? palette.hover
                      : 'transparent',
                  },
                ]}
              >
                {active ? <View style={styles.activeIndicator} /> : null}
                <View style={[styles.iconContainer, collapsed && styles.iconCollapsedSpacing]}>
                  <IconSymbol
                    name={item.icon}
                    size={18}
                    color={active ? palette.highlight : palette.textSecondary}
                  />
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
              const selected = account.active;
              return (
                <Pressable
                  key={account.username}
                  accessibilityRole="button"
                  accessibilityLabel={`Switch to ${account.displayName}`}
                  onPress={() => handleAccountSelect(account.username)}
                  style={({ pressed }) => [
                    styles.accountOption,
                    (selected || pressed) && { backgroundColor: palette.highlightSoft },
                  ]}
                >
                  <View style={styles.avatarSmall}>
                    <Text style={styles.avatarText}>{account.avatar}</Text>
                  </View>
                  {!collapsed ? (
                    <View style={styles.accountDetails}>
                      <Text style={styles.accountDisplay}>{account.displayName}</Text>
                      <Text style={styles.accountUsername}>@{account.username}</Text>
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

      <Modal transparent visible={showAddAccountModal} animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Account</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close add account"
                onPress={closeModal}
                style={({ pressed }) => [styles.closeButton, pressed && { backgroundColor: palette.hover }]}
              >
                <IconSymbol name="xmark.circle.fill" size={18} color={palette.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalDescription}>
                Sign in to your Bluesky account to add it to this app.
              </Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Handle or Email</Text>
                <TextInput
                  placeholder="username.bsky.social or email@example.com"
                  placeholderTextColor={palette.textMuted}
                  style={styles.input}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  placeholder="Enter your password"
                  placeholderTextColor={palette.textMuted}
                  secureTextEntry
                  style={styles.input}
                />
              </View>
              <Text style={styles.credentialsNote}>
                Your login credentials are stored securely and only used to authenticate with Bluesky.
              </Text>
              <View style={styles.modalActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  onPress={closeModal}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && { backgroundColor: palette.hover },
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Sign in"
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text style={styles.primaryButtonText}>Sign In</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.background,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
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
    borderRadius: 12,
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
    borderRadius: 12,
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
    left: 4,
    top: 6,
    bottom: 6,
    width: 3,
    borderRadius: 999,
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
    borderRadius: 10,
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
    borderRadius: 10,
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
    borderRadius: 14,
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
    borderRadius: 10,
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
    borderRadius: 999,
    backgroundColor: '#22C55E',
    marginLeft: 12,
  },
  accountSelectorFooter: {
    borderTopWidth: 1,
    borderColor: palette.border,
    paddingTop: 8,
  },
  addAccountButton: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  addAccountText: {
    color: palette.highlight,
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: palette.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.headerBackground,
  },
  modalTitle: {
    color: palette.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  closeButton: {
    borderRadius: 999,
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  modalDescription: {
    color: palette.textSecondary,
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    color: palette.textMuted,
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: palette.inputBackground,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: palette.textPrimary,
    fontSize: 14,
  },
  credentialsNote: {
    color: palette.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  secondaryButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
    backgroundColor: palette.inputBackground,
  },
  secondaryButtonText: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  primaryButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: palette.highlight,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
