import React from 'react';
import { StyleSheet } from 'react-native';

import { AddAccountForm } from '@/components/AddAccountForm';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { SettingsScroll } from '@/components/settings/SettingsScroll';
import { spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

export default function AddAccountScreen() {
  const { t } = useTranslation();

  return (
    <SettingsSubpageLayout title={t('common.addAccount')}>
      <SettingsScroll
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <AddAccountForm />
      </SettingsScroll>
    </SettingsSubpageLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxxl,
  },
});
