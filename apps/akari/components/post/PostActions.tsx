import * as Haptics from 'expo-haptics';
import React, { useCallback, useState } from 'react';
import { Platform, Share, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { RepostSheet } from '@/components/post/RepostSheet';
import { spacing, fontSize, opacity, activeOpacity, semanticColors, hitSlop } from '@/constants/tokens';
import { formatCompactNumber } from '@/utils/formatNumber';
import { useBookmarkPost } from '@/hooks/mutations/useBookmarkPost';
import { useLikePost } from '@/hooks/mutations/useLikePost';
import { useRepostPost } from '@/hooks/mutations/useRepostPost';
import { useThemeColor } from '@/hooks/useThemeColor';

type PostActionsProps = {
  uri?: string;
  cid?: string;
  likeUri?: string;
  repostUri?: string;
  authorHandle: string;
  authorName: string;
  commentCount: number;
  repostCount: number;
  likeCount: number;
  /** Set when the post's threadgate excludes the viewer; the reply button
   * dims and a small lock icon appears next to it. */
  replyDisabled?: boolean;
  onReplyPress: () => void;
  onMorePress: () => void;
  onQuotePress?: () => void;
};

export const PostActions = React.memo(function PostActions({
  uri,
  cid,
  likeUri,
  repostUri,
  authorHandle,
  authorName,
  commentCount,
  repostCount,
  likeCount,
  replyDisabled,
  onReplyPress,
  onMorePress,
  onQuotePress,
}: PostActionsProps) {
  const likeMutation = useLikePost();
  const repostMutation = useRepostPost();
  const bookmarkMutation = useBookmarkPost();
  const isLiked = Boolean(likeUri);
  const isReposted = Boolean(repostUri);
  const [repostSheetVisible, setRepostSheetVisible] = useState(false);

  const iconColor = useThemeColor(
    { light: '#687076', dark: '#9BA1A6' },
    'text',
  );

  const handleLikePress = useCallback(() => {
    if (!uri || !cid) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (likeUri) {
      likeMutation.mutate({
        postUri: uri,
        likeUri,
        action: 'unlike',
      });
    } else {
      likeMutation.mutate({
        postUri: uri,
        postCid: cid,
        action: 'like',
      });
    }
  }, [uri, cid, likeUri, likeMutation]);

  const handleRepostButtonPress = useCallback(() => {
    if (!uri || !cid) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRepostSheetVisible(true);
  }, [uri, cid]);

  const handleRepostConfirm = useCallback(() => {
    if (!uri || !cid) return;
    if (repostUri) {
      repostMutation.mutate({
        postUri: uri,
        repostUri,
        action: 'unrepost',
      });
    } else {
      repostMutation.mutate({
        postUri: uri,
        postCid: cid,
        action: 'repost',
      });
    }
  }, [uri, cid, repostUri, repostMutation]);

  const handleQuoteConfirm = useCallback(() => {
    if (!onQuotePress) return;
    onQuotePress();
  }, [onQuotePress]);

  const handleSheetDismiss = useCallback(() => {
    setRepostSheetVisible(false);
  }, []);

  const handleBookmarkPress = useCallback(() => {
    if (!uri || !cid) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    bookmarkMutation.mutate({
      postUri: uri,
      postCid: cid,
      action: 'bookmark',
    });
  }, [uri, cid, bookmarkMutation]);

  const handleSharePress = useCallback(() => {
    if (!uri) return;
    const postUrl = `https://bsky.app/profile/${authorHandle}/post/${uri.split('/').pop()}`;
    void Share.share(
      Platform.OS === 'ios'
        ? { url: postUrl }
        : { message: postUrl },
    );
  }, [uri, authorHandle]);

  return (
    <>
    <View style={styles.interactions}>
      <TouchableOpacity
        style={[styles.interactionItem, replyDisabled && styles.interactionDisabled]}
        onPress={replyDisabled ? undefined : onReplyPress}
        disabled={replyDisabled}
        activeOpacity={replyDisabled ? 1 : activeOpacity.default}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!replyDisabled }}
        accessibilityLabel={
          replyDisabled
            ? `Replies restricted on post by ${authorName}`
            : `Reply to post by ${authorName}`
        }
      >
        <IconSymbol
          name={replyDisabled ? 'lock' : 'bubble.left'}
          size={20}
          color={iconColor}
        />
        <ThemedText style={styles.interactionCount}>{formatCompactNumber(commentCount)}</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.interactionItem}
        onPress={handleRepostButtonPress}
        activeOpacity={activeOpacity.default}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel={isReposted ? `Unrepost post by ${authorName}` : `Repost or quote post by ${authorName}`}
      >
        <IconSymbol name="arrow.2.squarepath" size={20} color={isReposted ? '#34C759' : iconColor} />
        <ThemedText style={styles.interactionCount}>{formatCompactNumber(repostCount)}</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.interactionItem}
        onPress={handleLikePress}
        activeOpacity={activeOpacity.default}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel={isLiked ? `Unlike post by ${authorName}` : `Like post by ${authorName}`}
      >
        <IconSymbol
          name={isLiked ? 'heart.fill' : 'heart'}
          size={20}
          color={isLiked ? semanticColors.like : iconColor}
        />
        <ThemedText style={styles.interactionCount}>{formatCompactNumber(likeCount)}</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.interactionItem}
        onPress={handleBookmarkPress}
        activeOpacity={activeOpacity.default}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel="Save post"
      >
        <IconSymbol name="bookmark" size={20} color={iconColor} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.interactionItem}
        onPress={handleSharePress}
        activeOpacity={activeOpacity.default}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel="Share post"
      >
        <IconSymbol name="square.and.arrow.up" size={20} color={iconColor} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.interactionItem}
        onPress={onMorePress}
        activeOpacity={activeOpacity.strong}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel={`More actions for post by ${authorName}`}
      >
        <IconSymbol name="ellipsis" size={20} color={iconColor} />
      </TouchableOpacity>
    </View>
    <RepostSheet
      visible={repostSheetVisible}
      isReposted={isReposted}
      onDismiss={handleSheetDismiss}
      onRepostPress={handleRepostConfirm}
      onQuotePress={handleQuoteConfirm}
    />
    </>
  );
});

const styles = StyleSheet.create({
  interactions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  interactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  interactionDisabled: {
    opacity: opacity.tertiary,
  },
  interactionCount: {
    fontSize: fontSize.base,
    opacity: opacity.secondary,
  },
});
