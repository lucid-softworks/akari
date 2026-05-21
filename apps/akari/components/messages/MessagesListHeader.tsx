import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Image } from '@/components/Image';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import type { CommonTranslationPath, PendingButtonConfig } from '@/components/messages/types';
import { activeOpacity, fontSize, fontWeight, layout, radius, spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

type PreviewAvatar = { key: string; uri?: string; fallback: string };

type MessagesListHeaderProps = {
  titleKey: CommonTranslationPath;
  isLargeScreen: boolean;
  insetTop: number;
  borderColor: string;
  tintColor: string;
  pendingButtonConfig?: PendingButtonConfig;
  previewAvatars: PreviewAvatar[];
  onBackPress?: () => void;
};

export function MessagesListHeader({
  titleKey,
  isLargeScreen,
  insetTop,
  borderColor,
  tintColor,
  pendingButtonConfig,
  previewAvatars,
  onBackPress,
}: MessagesListHeaderProps) {
  const { t } = useTranslation();

  return (
    <ThemedView
      style={[
        styles.headerContainer,
        {
          paddingTop: isLargeScreen ? insetTop : 0,
        },
      ]}
    >
      {isLargeScreen ? (
        <ThemedView style={[styles.header, { borderBottomColor: borderColor }]}>
          <ThemedView style={styles.headerTitleContainer}>
            {onBackPress ? (
              <Pressable
                style={({ pressed }) => [styles.backButton, pressed && { opacity: activeOpacity.default }]}
                onPress={onBackPress}
              >
                <IconSymbol name="chevron.left" size={24} color="#007AFF" />
              </Pressable>
            ) : null}
            <ThemedText style={styles.title}>{t(titleKey)}</ThemedText>
          </ThemedView>
          <View style={styles.headerActions}>
            {pendingButtonConfig ? (
              <>
                <Pressable
                  style={({ pressed }) => [styles.pendingButton, pressed && { opacity: activeOpacity.default }]}
                  onPress={pendingButtonConfig.onPress}
                >
                  <ThemedText style={styles.pendingButtonText}>{t(pendingButtonConfig.labelKey)}</ThemedText>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.newChatButton, pressed && { opacity: activeOpacity.default }]}
                  onPress={() => router.push('/(tabs)/messages/new' as any)}
                  accessibilityLabel={t('messages.newChat')}
                >
                  <IconSymbol name="square.and.pencil" size={22} color={tintColor} />
                </Pressable>
              </>
            ) : null}
          </View>
        </ThemedView>
      ) : pendingButtonConfig ? (
        <ThemedView style={[styles.mobileToolbar, { borderBottomColor: borderColor }]}>
          <View style={styles.mobileToolbarAvatars}>
            {previewAvatars.map((avatar, index) => (
              <ThemedView
                key={avatar.key}
                style={[
                  styles.mobileAvatar,
                  { borderColor },
                  index > 0 && styles.mobileAvatarOverlap,
                ]}
              >
                {avatar.uri ? (
                  <Image source={{ uri: avatar.uri }} style={styles.mobileAvatarImage} contentFit="cover" />
                ) : (
                  <ThemedText style={styles.mobileAvatarFallback}>{avatar.fallback}</ThemedText>
                )}
              </ThemedView>
            ))}
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={({ pressed }) => [styles.mobilePendingButton, pressed && { opacity: activeOpacity.default }]}
              onPress={pendingButtonConfig.onPress}
            >
              <ThemedText style={styles.mobilePendingButtonText}>{t(pendingButtonConfig.labelKey)}</ThemedText>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.newChatButton, pressed && { opacity: activeOpacity.default }]}
              onPress={() => router.push('/(tabs)/messages/new' as any)}
              accessibilityLabel={t('messages.newChat')}
            >
              <IconSymbol name="square.and.pencil" size={22} color={tintColor} />
            </Pressable>
          </View>
        </ThemedView>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: spacing.lg,
  },
  header: {
    paddingHorizontal: 0,
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mobileToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
  },
  mobileToolbarAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mobileAvatar: {
    width: layout.avatarSmall,
    height: layout.avatarSmall,
    borderRadius: layout.avatarSmall / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderWidth: 2,
  },
  mobileAvatarOverlap: {
    marginLeft: -spacing.sm,
  },
  mobileAvatarImage: {
    width: layout.avatarSmall,
    height: layout.avatarSmall,
  },
  mobileAvatarFallback: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: '#FFFFFF',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: spacing.md,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
  },
  pendingButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.lg,
  },
  pendingButtonText: {
    color: 'white',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  mobilePendingButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.lg,
  },
  mobilePendingButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  newChatButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
