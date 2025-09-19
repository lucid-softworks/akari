import { Image } from 'expo-image';
import React, { useCallback, useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddAccountPanel } from '@/components/AddAccountPanel';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { DialogModal } from '@/components/ui/DialogModal';
import { useDialogManager } from '@/contexts/DialogContext';
import { ADD_ACCOUNT_PANEL_ID } from '@/constants/dialogs';
import { useSwitchAccount } from '@/hooks/mutations/useSwitchAccount';
import { useAccounts } from '@/hooks/queries/useAccounts';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useAppTheme } from '@/theme';
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

  const { colors } = useAppTheme();
  const borderColor = useBorderColor();
  const handleColor = useBorderColor('muted');

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
        <DialogModal onRequestClose={closePanel}>
          <AddAccountPanel panelId={ADD_ACCOUNT_PANEL_ID} />
        </DialogModal>
      ),
    });
  }, [dialogManager, onClose]);

  if (!visible) {
    return null;
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: colors.overlayStrong }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
        />
        <ThemedView
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: bottom + 16,
              borderTopColor: borderColor,
            },
          ]}
        >
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: handleColor }]} />
          </View>

          <View style={styles.header}>
            <ThemedText type="defaultSemiBold">{t('common.switchAccount')}</ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textMuted }]}>
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
                <ThemedText style={[styles.emptyStateText, { color: colors.textMuted }]}>
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
                  <TouchableOpacity
                    key={account.did}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={accessibilityLabel}
                    onPress={() => handleAccountSelect(account)}
                    style={({ pressed }) => [
                      styles.accountOption,
                      (selected || pressed) && { backgroundColor: colors.surfaceActive },
                    ]}
                  >
                    <View style={[styles.avatar, { backgroundColor: colors.accentMuted }]}>
                      {account.avatar ? (
                        <Image source={{ uri: account.avatar }} style={styles.avatarImage} contentFit="cover" />
                      ) : (
                        <ThemedText
                          style={styles.avatarFallback}
                          lightColor={colors.inverseText}
                          darkColor={colors.inverseText}
                        >
                          {getAccountInitial(account)}
                        </ThemedText>
                      )}
                    </View>

                    <View style={styles.accountDetails}>
                      <ThemedText style={styles.accountName} numberOfLines={1}>
                        {account.displayName ?? account.handle}
                      </ThemedText>
                      {account.handle ? (
                        <ThemedText style={[styles.accountHandle, { color: colors.textMuted }]}>@{account.handle}</ThemedText>
                      ) : null}
                      {selected ? (
                        <View style={[styles.currentBadge, { backgroundColor: colors.accentMuted }]}>
                          <ThemedText style={[styles.currentBadgeText, { color: colors.accent }]}>
                            {t('common.current')}
                          </ThemedText>
                        </View>
                      ) : null}
                    </View>

                    {selected ? (
                      <IconSymbol name="checkmark.circle.fill" size={22} color={colors.accent} />
                    ) : (
                      <IconSymbol name="circle" size={22} color={handleColor} />
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={handleAddAccount}
            style={[styles.addAccountButton, { borderColor }]}
          >
            <IconSymbol name="plus" size={18} color={colors.accent} style={styles.addAccountIcon} />
            <ThemedText style={[styles.addAccountText, { color: colors.accent }]}>
              {t('common.addAccount')}
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 999,
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
});
