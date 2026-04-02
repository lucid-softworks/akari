import { Image } from 'expo-image';
import React, { useCallback, useRef } from 'react';
import { Platform, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useNavigateToProfile } from '@/utils/navigation';

type PostHeaderProps = {
  author: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  };
  createdAt: string;
  isLive: boolean;
  onMenuToggle: () => void;
  menuButtonRef: React.RefObject<any>;
  onAvatarHoverChange?: (hovered: boolean) => void;
};

export const PostHeader = React.memo(function PostHeader({
  author,
  createdAt,
  isLive,
  onMenuToggle,
  menuButtonRef,
  onAvatarHoverChange,
}: PostHeaderProps) {
  const navigateToProfile = useNavigateToProfile();

  const iconColor = useThemeColor(
    { light: '#687076', dark: '#9BA1A6' },
    'text',
  );

  const authorName = author.displayName || author.handle;

  const handleProfilePress = useCallback(() => {
    navigateToProfile({ actor: author.handle });
  }, [navigateToProfile, author.handle]);

  const handleAvatarPointerEnter = useCallback(() => {
    if (Platform.OS === 'web') {
      onAvatarHoverChange?.(true);
    }
  }, [onAvatarHoverChange]);

  const handleAvatarPointerLeave = useCallback(() => {
    if (Platform.OS === 'web') {
      onAvatarHoverChange?.(false);
    }
  }, [onAvatarHoverChange]);

  return (
    <ThemedView style={styles.header}>
      <ThemedView style={styles.authorSection}>
        <Pressable
          onPress={handleProfilePress}
          accessibilityRole="button"
          accessibilityLabel={`View ${authorName}'s profile via avatar`}
          onPointerEnter={handleAvatarPointerEnter}
          onPointerLeave={handleAvatarPointerLeave}
          style={({ pressed }) => [styles.avatarPressable, pressed && styles.avatarPressablePressed]}
        >
          <View style={[styles.avatarWrapper, isLive && styles.liveAvatarWrapper]}>
            <Image
              source={{
                uri: author.avatar || 'https://bsky.app/static/default-avatar.png',
              }}
              style={styles.authorAvatar}
              contentFit="cover"
              placeholder={require('@/assets/images/partial-react-logo.png')}
            />
            {isLive && (
              <View style={styles.liveBadge}>
                <ThemedText style={styles.liveBadgeText}>LIVE</ThemedText>
              </View>
            )}
          </View>
        </Pressable>
        <ThemedView style={styles.authorInfo}>
          <ThemedText style={styles.displayName}>{authorName}</ThemedText>
          <TouchableOpacity
            onPress={handleProfilePress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`View profile of ${authorName}`}
          >
            <ThemedText style={styles.handle}>@{author.handle}</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
      <View style={styles.headerMeta}>
        <ThemedText style={styles.timestamp}>{createdAt}</ThemedText>
        <TouchableOpacity
          ref={menuButtonRef}
          onPress={onMenuToggle}
          style={styles.menuButton}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel={`Actions - ${authorName}`}
        >
          <IconSymbol name="ellipsis" size={18} color={iconColor} />
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
});

const LIVE_ACCENT_COLOR = '#ff274c';

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  avatarPressable: {
    borderRadius: 24,
  },
  avatarPressablePressed: {
    opacity: 0.7,
  },
  avatarWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveAvatarWrapper: {
    padding: 2,
    borderWidth: 2,
    borderColor: LIVE_ACCENT_COLOR,
    borderRadius: 24,
  },
  liveBadge: {
    position: 'absolute',
    bottom: -10,
    alignSelf: 'center',
    backgroundColor: LIVE_ACCENT_COLOR,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  liveBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  authorInfo: {
    flex: 1,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 4,
    marginLeft: 12,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
  },
  handle: {
    fontSize: 14,
    opacity: 0.7,
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.6,
  },
});
