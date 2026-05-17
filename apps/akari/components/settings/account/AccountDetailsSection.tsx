import { StyleSheet } from 'react-native';

import { InfoRow } from '@/components/settings/AccountComponents';
import { SettingsSection } from '@/components/settings/SettingsList';
import { ThemedView } from '@/components/ThemedView';
import { spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

type AccountDetailsSectionProps = {
  handle: string;
  did: string;
  borderColor: string;
};

/**
 * Displays the handle and DID for the currently active account in a
 * read-only "Account details" card.
 */
export function AccountDetailsSection({
  handle,
  did,
  borderColor,
}: AccountDetailsSectionProps) {
  const { t } = useTranslation();

  return (
    <SettingsSection title={t('settings.accountDetails')}>
      <ThemedView style={[styles.sectionCard, { borderColor }]}>
        <InfoRow borderColor={borderColor} label={t('common.handle')} value={`@${handle}`} />
        <InfoRow borderColor={borderColor} label="DID" monospace value={did} />
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
});
