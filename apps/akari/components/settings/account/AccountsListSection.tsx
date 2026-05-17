import { StyleSheet } from 'react-native';

import { AccountRow } from '@/components/settings/AccountComponents';
import { SettingsRow, SettingsSection } from '@/components/settings/SettingsList';
import { ThemedView } from '@/components/ThemedView';
import { spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';
import { Account } from '@/types/account';

type AccountProfileSnapshot = {
  avatar?: string;
  displayName?: string;
};

type AccountsListSectionProps = {
  accounts: Account[];
  accountProfiles: Record<string, AccountProfileSnapshot> | undefined;
  currentDid: string | undefined;
  borderColor: string;
  onSwitch: (account: Account) => void;
  onRemove: (account: Account) => void;
};

/**
 * Renders the "Accounts" section: a card listing each signed-in
 * account with the current account marked. Falls back to an empty
 * row when no accounts are signed in.
 */
export function AccountsListSection({
  accounts,
  accountProfiles,
  currentDid,
  borderColor,
  onSwitch,
  onRemove,
}: AccountsListSectionProps) {
  const { t } = useTranslation();

  return (
    <SettingsSection isFirst title={t('common.accounts')}>
      <ThemedView style={[styles.sectionCard, { borderColor }]}>
        {accounts.length === 0 ? (
          <ThemedView style={styles.emptyState}>
            <SettingsRow
              borderColor={borderColor}
              description={t('common.noAccounts')}
              icon="person.crop.circle.badge.xmark"
              label={t('common.accounts')}
              showDivider={false}
            />
          </ThemedView>
        ) : (
          accounts.map((account) => {
            const profile = accountProfiles?.[account.did];
            const avatar = profile?.avatar || account.avatar;
            const displayName = profile?.displayName || account.displayName;
            const isCurrent = account.did === currentDid;

            return (
              <AccountRow
                key={account.did}
                account={account}
                avatar={avatar}
                borderColor={borderColor}
                currentLabel={t('common.current')}
                displayName={displayName}
                isCurrent={isCurrent}
                onRemove={() => onRemove(account)}
                onSwitch={isCurrent ? undefined : () => onSwitch(account)}
                removeLabel={t('common.remove')}
                switchLabel={t('common.switch')}
              />
            );
          })
        )}
      </ThemedView>
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  emptyState: {
    borderBottomWidth: 0,
  },
});
