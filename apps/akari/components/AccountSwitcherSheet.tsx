import { Image } from '@/components/Image';
import React, { useCallback, useMemo } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddAccountForm } from '@/components/AddAccountForm';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Dialog } from '@/components/ui/Dialog';
import { useDialogManager } from '@/contexts/DialogContext';
import { ADD_ACCOUNT_PANEL_ID } from '@/constants/dialogs';
import { useSwitchAccount } from '@/hooks/mutations/useSwitchAccount';
import { useAccounts } from '@/hooks/queries/useAccounts';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { Account } from '@/types/account';

type AccountSwitcherSheetProps = {
  visible: boolean;
  onClose: () => void;
};

export function AccountSwitcherSheet({ visible, onClose }: AccountSwitcherSheetProps) {
  const { t } = useTranslation();
  const { bottom } = useSafeAreaInsets();
  const { data: accounts = [] } = useAccounts();
  const { data: currentAccount } = useCurrentAccount();
  const switchAccountMutation = useSwitchAccount();
  const dialogManager = useDialogManager();

  const sheetBackground = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const secondaryTextColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const avatarBackground = useThemeColor({ light: '#E0E7FF', dark: '#1E2537' }, 'background');
  const handleColor = useThemeColor({ light: '#E5E7EB', dark: '#1F2937' }, 'border');
  const borderColor = useBorderColor();

  const activeAccount: Account | undefined = useMemo(
    () => currentAccount ?? accounts[0],
    [accounts, currentAccount],
  );

  const getAccountInitial = useCallback((account?: Account) => {
    if (!account) {
      return 'U';
    }

    const source = account.displayName || account.handle;

    if (!source) {
      return 'U';
    }

    return source.charAt(0).toUpperCase();
  }, []);

  const handleAccountSelect = useCallback(
    (account: Account) => {
      onClose();

      if (!account || account.did === currentAccount?.did) {
        return;
      }

      switchAccountMutation.mutate(account);
    },
    [currentAccount?.did, onClose, switchAccountMutation],
  );

  const handleAddAccount = useCallback(() => {
    onClose();
    const closePanel = () => dialogManager.close(ADD_ACCOUNT_PANEL_ID);

    dialogManager.open({
      id: ADD_ACCOUNT_PANEL_ID,
      component: (
        <Dialog
          onClose={closePanel}
          maxWidth={420}
          backgroundColor={sheetBackground}
          sheetStyle={styles.addAccountFormPadding}
        >
          <AddAccountForm />
        </Dialog>
      ),
    });
  }, [dialogManager, sheetBackground]);

  if (!visible) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheetWrapper, { paddingBottom: bottom + 16 }]}
          onPress={(e) => e.stopPropagation()}
        >
          <ThemedView
            style={[styles.sheet, { backgroundColor: sheetBackground, borderColor }]}
          >
          <View style={styles.header}>
            <ThemedText type="defaultSemiBold">{t('common.switchAccount')}</ThemedText>
            <ThemedText style={[styles.subtitle, { color: secondaryTextColor }]}>
              {t('common.accounts')} ({accounts.length})
            </ThemedText>
          </View>

          <ScrollView
            style={styles.accountsScroll}
            contentContainerStyle={styles.accountsContent}
            showsVerticalScrollIndicator={false}
          >
            {accounts.length === 0 ? (
              <View style={styles.emptyState}>
                <ThemedText style={[styles.emptyStateText, { color: secondaryTextColor }]}>
                  {t('common.noAccounts')}
                </ThemedText>
              </View>
            ) : (
              accounts.map((account) => {
                const selected = account.did === activeAccount?.did;
                const accessibilityLabel = t('profile.switchToAccount', {
                  handle: account.handle ?? account.displayName ?? 'account',
                });

                return (
                  <Pressable
                    key={account.did}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={accessibilityLabel}
                    onPress={() => handleAccountSelect(account)}
                    style={({ pressed }) => [styles.accountOption, pressed && { opacity: 0.7 }]}
                  >
                    <View style={[styles.avatar, { backgroundColor: avatarBackground }]}>
                      {account.avatar ? (
                        <Image source={{ uri: account.avatar }} style={styles.avatarImage} contentFit="cover" />
                      ) : (
                        <ThemedText style={styles.avatarFallback} lightColor="#ffffff" darkColor="#ffffff">
                          {getAccountInitial(account)}
                        </ThemedText>
                      )}
                    </View>

                    <View style={styles.accountDetails}>
                      <ThemedText style={styles.accountName} numberOfLines={1}>
                        {account.displayName ?? account.handle}
                      </ThemedText>
                      {account.handle ? (
                        <ThemedText style={[styles.accountHandle, { color: secondaryTextColor }]}>@{account.handle}</ThemedText>
                      ) : null}
                      {selected ? (
                        <View style={[styles.currentBadge, { backgroundColor: avatarBackground }]}>
                          <ThemedText style={[styles.currentBadgeText, { color: accentColor }]}>
                            {t('common.current')}
                          </ThemedText>
                        </View>
                      ) : null}
                    </View>

                    {selected ? (
                      <IconSymbol name="checkmark.circle.fill" size={22} color={accentColor} />
                    ) : (
                      <IconSymbol name="circle" size={22} color={handleColor} />
                    )}
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            onPress={handleAddAccount}
            style={({ pressed }) => [styles.addAccountButton, { borderColor }, pressed && { opacity: 0.7 }]}
          >
            <IconSymbol name="plus" size={18} color={accentColor} style={styles.addAccountIcon} />
            <ThemedText style={[styles.addAccountText, { color: accentColor }]}>
              {t('common.addAccount')}
            </ThemedText>
          </Pressable>
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Bottom-sheet pattern matching PostControlsSheet / DraftsSheet so the
  // account switcher feels like the same family of overlays instead of
  // taking over the whole screen.
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheetWrapper: { paddingHorizontal: 16 },
  sheet: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingTop: 16,
    ...Platform.select({
      web: { maxWidth: 480, alignSelf: 'center', width: '100%' },
      default: {},
    }),
  },
  header: {
    gap: 2,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
  },
  accountsScroll: {
    maxHeight: 320,
  },
  accountsContent: {
    paddingBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyStateText: {
    fontSize: 14,
  },
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    fontSize: 16,
    fontWeight: '600',
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
  },
  accountHandle: {
    fontSize: 14,
    marginTop: 2,
  },
  currentBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addAccountButton: {
    marginTop: 16,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  addAccountIcon: {
    marginRight: 8,
  },
  addAccountText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Padding only — Dialog already paints the surface (background +
  // border + rounded corners), so the consumer just supplies inner
  // spacing.
  addAccountFormPadding: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
});
