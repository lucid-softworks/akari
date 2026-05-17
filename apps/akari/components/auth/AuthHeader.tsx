import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Image } from '@/components/Image';
import { ThemedText } from '@/components/ThemedText';
import { fontSize, fontWeight, radius, spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

type AuthHeaderProps = {
  helperColor: string;
};

export function AuthHeader({ helperColor }: AuthHeaderProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.passwordHeader}>
      <Image
        source={require('@/assets/images/icon.png')}
        style={styles.passwordLogo}
        contentFit="contain"
      />
      <ThemedText type="title" style={styles.passwordTitle}>
        {t('auth.passwordScreenTitle')}
      </ThemedText>
      <ThemedText style={[styles.passwordSubtitle, { color: helperColor }]}>
        {t('auth.passwordScreenSubtitle')}
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
