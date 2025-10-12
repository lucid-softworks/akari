import { router } from 'expo-router';
import React, { useCallback } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type SettingsHeaderProps = {
  title: string;
};

export function SettingsHeader({ title }: SettingsHeaderProps) {
  const insets = useSafeAreaInsets();
  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({}, 'text');
  const { t } = useTranslation();

  const handleGoBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(home,search,notifications,messages,post,profile)/settings');
    }
  }, []);

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 12, borderBottomColor: borderColor }]}>
      <TouchableOpacity
        accessibilityLabel={t('navigation.settings')}
        accessibilityRole="button"
        activeOpacity={0.7}
        onPress={handleGoBack}
        style={styles.backButton}
      >
        <IconSymbol color={iconColor} name="chevron.left" size={20} />
      </TouchableOpacity>

      <ThemedText style={styles.title}>{title}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    height: 44,
    width: 44,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
  },
});
