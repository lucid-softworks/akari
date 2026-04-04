import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { AddAccountForm } from '@/components/AddAccountForm';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

export default function AddAccountScreen() {
  const { t } = useTranslation();

  return (
    <SettingsSubpageLayout title={t('common.addAccount')}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <AddAccountForm />
      </ScrollView>
    </SettingsSubpageLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxxl,
  },
});
