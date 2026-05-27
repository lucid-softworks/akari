import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppLogo } from '@/components/AppLogo';
import { ThemedText } from '@/components/ThemedText';
import { fontSize, fontWeight, radius, spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

type AuthHeaderProps = {
  helperColor: string;
  /** Defaults to the app-password screen's title/subtitle for backwards compat. */
  title?: string;
  subtitle?: string;
};

export function AuthHeader({ helperColor, title, subtitle }: AuthHeaderProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.passwordHeader}>
      <AppLogo style={styles.passwordLogo} />
      <ThemedText type="title" style={styles.passwordTitle}>
        {title ?? t('auth.passwordScreenTitle')}
      </ThemedText>
      <ThemedText style={[styles.passwordSubtitle, { color: helperColor }]}>
        {subtitle ?? t('auth.passwordScreenSubtitle')}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  passwordHeader: {
    alignItems: 'center',
    gap: spacing.md,
  },
  passwordLogo: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
  },
  passwordTitle: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  passwordSubtitle: {
    fontSize: fontSize.base,
    lineHeight: 22,
    textAlign: 'center',
  },
});
