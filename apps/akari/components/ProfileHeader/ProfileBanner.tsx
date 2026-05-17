import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Image } from '@/components/Image';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { fontSize, opacity } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type ProfileBannerProps = {
  banner?: string;
};

export function ProfileBanner({ banner }: ProfileBannerProps) {
  const { t } = useTranslation();
  const bannerPlaceholderColor = useThemeColor({ light: '#e0e0e0', dark: '#2A2D2E' }, 'background');

  return (
    <ThemedView style={styles.banner}>
      {banner ? (
        <Image source={{ uri: banner }} style={styles.bannerImage} contentFit="cover" />
      ) : (
        <View style={[styles.bannerPlaceholder, { backgroundColor: bannerPlaceholderColor }]}>
          <ThemedText style={styles.bannerPlaceholderText}>{t('ui.noBanner')}</ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: 150,
    backgroundColor: '#f0f0f0',
  },
  bannerImage: {
    flex: 1,
  },
  bannerPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerPlaceholderText: {
    fontSize: fontSize.lg,
    opacity: opacity.tertiary + 0.1,
  },
});
