import * as Haptics from 'expo-haptics';
import React, { useCallback, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { SharePostSheet } from '@/components/SharePostSheet';
import { ShareToChatSheet } from '@/components/ShareToChatSheet';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { RepostSheet } from '@/components/post/RepostSheet';
import {
  spacing,
  fontSize,
  opacity,
  activeOpacity,
  radius,
  semanticColors,
  hexToRgba,
  hitSlop,
} from '@/constants/tokens';
import { formatCompactNumber } from '@/utils/formatNumber';
import { useBookmarkPost } from '@/hooks/mutations/useBookmarkPost';
import { useLikePost } from '@/hooks/mutations/useLikePost';
import { useRepostPost } from '@/hooks/mutations/useRepostPost';
import { useAccessibilitySettings } from '@/hooks/useAccessibilitySettings';
import { useThemeColor } from '@/hooks/useThemeColor';

export type ActionAnchorRect = {
  top: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
};

type PostActionsProps = {
  uri?: string;
  cid?: string;
  likeUri?: string;
  repostUri?: string;
  isBookmarked?: boolean;
  authorHandle: string;
  authorName: string;
  commentCount: number;
  repostCount: number;
  likeCount: number;
  /** Set when the post's threadgate excludes the viewer; the reply button
   * dims and a small lock icon appears next to it. */
  replyDisabled?: boolean;
  onReplyPress: () => void;
  /** Called when the more (...) button is pressed. On web the click event's
   *  target rect is forwarded so the caller can anchor a portal-rendered
   *  menu next to the trigger. */
  onMorePress: (rect?: ActionAnchorRect) => void;
  onQuotePress?: () => void;
};

// 0.13s ease transition for icon color + wash background on web. Native
// platforms have no hover, so the transition object is null there.
const WEB_TRANSITION: ViewStyle | null = Platform.OS === 'web'
  ? ({
      transitionProperty: 'background-color, color',
      transitionDuration: '0.13s',
      transitionTimingFunction: 'ease',
    } as ViewStyle)
  : null;

type ActionButtonProps = {
  icon: string;
  activeIcon?: string;
  isActive?: boolean;
  /** The color this button takes on when hovered (web) or active (toggled on). */
  activeColor: string;
  /** Numeric counter shown next to the icon. Omit for icon-only buttons. */
  count?: number;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
  largerTextBadges?: boolean;
  buttonRef?: React.Ref<View>;
};

const ActionButton = React.memo(function ActionButton({
  icon,
  activeIcon,
  isActive,
  activeColor,
  count,
  onPress,
  disabled,
  accessibilityLabel,
  largerTextBadges,
  buttonRef,
}: ActionButtonProps) {
  const [hovered, setHovered] = useState(false);
  const restingColor = useThemeColor({}, 'textTertiary');

  const tinted = !disabled && (isActive || hovered);
  const color = tinted ? activeColor : restingColor;
  // Wash only appears on hover, not when the toggle is active — matches the
  // common Twitter/Bluesky pattern (liked state is communicated by the filled
  // icon, not a permanent halo).
  const background = !disabled && hovered ? hexToRgba(activeColor, 0.1) : 'transparent';
  const iconName = isActive && activeIcon ? activeIcon : icon;

  return (
    <Pressable
      ref={buttonRef}
      onPress={onPress}
      onPointerEnter={Platform.OS === 'web' && !disabled ? () => setHovered(true) : undefined}
      onPointerLeave={Platform.OS === 'web' ? () => setHovered(false) : undefined}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.actionButton,
        { backgroundColor: background },
        disabled && styles.actionDisabled,
        pressed && !disabled && { opacity: activeOpacity.default },
        WEB_TRANSITION,
      ]}
    >
      <IconSymbol name={iconName} size={20} color={color} />
      {typeof count === 'number' ? (
        <ThemedText
          style={[
            styles.actionCount,
            largerTextBadges && styles.actionCountLarge,
            { color },
          ]}
        >
          {formatCompactNumber(count)}
        </ThemedText>
      ) : null}
    </Pressable>
  );
});

export const PostActions = React.memo(function PostActions({
  uri,
  cid,
  likeUri,
  repostUri,
  isBookmarked,
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
  const { largerTextBadges } = useAccessibilitySettings();
  const likeMutation = useLikePost();
  const repostMutation = useRepostPost();
  const bookmarkMutation = useBookmarkPost();
  const isLiked = Boolean(likeUri);
  const isReposted = Boolean(repostUri);
  const [repostSheetVisible, setRepostSheetVisible] = useState(false);
  const [repostAnchorRect, setRepostAnchorRect] = useState<ActionAnchorRect | null>(null);
  const repostButtonRef = useRef<View>(null);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [shareToChatVisible, setShareToChatVisible] = useState(false);

  // Reply/share both use the theme tint — defaults to #5c8aff for dark, picks
  // up the user's custom accent if they've set one.
  const accentColor = useThemeColor({}, 'tint');
  // Neutral hover color for the "more" button so it doesn't borrow an action
  // color it shouldn't suggest.
  const neutralAccent = useThemeColor({}, 'textSecondary');

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
    // Measure the button on web so the portaled menu anchors next to it
    // (matching the "..." menu pattern). Native ignores the rect and
    // renders the bottom sheet.
    const node = repostButtonRef.current;
    if (Platform.OS === 'web' && node) {
      const el = node as unknown as { getBoundingClientRect?: () => DOMRect };
      if (typeof el.getBoundingClientRect === 'function') {
        const r = el.getBoundingClientRect();
        setRepostAnchorRect({ top: r.top, bottom: r.bottom, left: r.left, width: r.width, height: r.height });
      }
    }
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
      action: isBookmarked ? 'unbookmark' : 'bookmark',
    });
  }, [uri, cid, isBookmarked, bookmarkMutation]);

  const postUrl = uri
    ? `https://bsky.app/profile/${authorHandle}/post/${uri.split('/').pop()}`
    : '';

  const handleSharePress = useCallback(() => {
    if (!uri) return;
    setShareSheetVisible(true);
  }, [uri]);

  const handleSendToChat = useCallback(() => {
    setShareSheetVisible(false);
    setShareToChatVisible(true);
  }, []);

  const moreButtonRef = useRef<View>(null);

  const handleMorePress = useCallback(() => {
    const node = moreButtonRef.current;
    if (!node) {
      onMorePress();
      return;
    }
    // On web the ref resolves to the underlying DOM element, so we can
    // pull the rect synchronously via getBoundingClientRect. Falling back
    // to measureInWindow handles both native and the rare case where the
    // ref doesn't expose a DOM API (eg. tests).
    if (Platform.OS === 'web') {
      const el = node as unknown as { getBoundingClientRect?: () => DOMRect };
      if (typeof el.getBoundingClientRect === 'function') {
        const r = el.getBoundingClientRect();
        onMorePress({ top: r.top, bottom: r.bottom, left: r.left, width: r.width, height: r.height });
        return;
      }
    }
    node.measureInWindow((x, y, width, height) => {
      onMorePress({ top: y, bottom: y + height, left: x, width, height });
    });
  }, [onMorePress]);

  return (
    <>
      <View style={styles.interactions}>
        <ActionButton
          icon={replyDisabled ? 'lock' : 'bubble.left'}
          activeColor={accentColor}
          count={commentCount}
          onPress={replyDisabled ? undefined : onReplyPress}
          disabled={replyDisabled}
          largerTextBadges={largerTextBadges}
          accessibilityLabel={
            replyDisabled
              ? `Replies restricted on post by ${authorName}`
              : `Reply to post by ${authorName}`
          }
        />

        <ActionButton
          icon="arrow.2.squarepath"
          isActive={isReposted}
          activeColor={semanticColors.repost}
          count={repostCount}
          onPress={handleRepostButtonPress}
          buttonRef={repostButtonRef}
          largerTextBadges={largerTextBadges}
          accessibilityLabel={
            isReposted
              ? `Unrepost post by ${authorName}`
              : `Repost or quote post by ${authorName}`
          }
        />

        <ActionButton
          icon="heart"
          activeIcon="heart.fill"
          isActive={isLiked}
          activeColor={semanticColors.like}
          count={likeCount}
          onPress={handleLikePress}
          largerTextBadges={largerTextBadges}
          accessibilityLabel={
            isLiked ? `Unlike post by ${authorName}` : `Like post by ${authorName}`
          }
        />

        <ActionButton
          icon="bookmark"
          activeIcon="bookmark.fill"
          isActive={isBookmarked}
          activeColor={semanticColors.bookmark}
          onPress={handleBookmarkPress}
          accessibilityLabel={
            isBookmarked
              ? `Remove bookmark on post by ${authorName}`
              : `Bookmark post by ${authorName}`
          }
        />

        <ActionButton
          icon="square.and.arrow.up"
          activeColor={accentColor}
          onPress={handleSharePress}
          accessibilityLabel="Share post"
        />

        <ActionButton
          icon="ellipsis"
          activeColor={neutralAccent}
          onPress={handleMorePress}
          buttonRef={moreButtonRef}
          accessibilityLabel={`More actions for post by ${authorName}`}
        />
      </View>
      <RepostSheet
        visible={repostSheetVisible}
        isReposted={isReposted}
        onDismiss={handleSheetDismiss}
        onRepostPress={handleRepostConfirm}
        onQuotePress={handleQuoteConfirm}
        anchorRect={repostAnchorRect}
      />
      {uri && cid ? (
        <SharePostSheet
          visible={shareSheetVisible}
          onDismiss={() => setShareSheetVisible(false)}
          onSendToChat={handleSendToChat}
          postUrl={postUrl}
          postUri={uri}
          postCid={cid}
        />
      ) : null}
      {uri && cid ? (
        <ShareToChatSheet
          visible={shareToChatVisible}
          onDismiss={() => setShareToChatVisible(false)}
          message={postUrl}
          postUri={uri}
          postCid={cid}
        />
      ) : null}
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  actionDisabled: {
    opacity: opacity.tertiary,
  },
  actionCount: {
    fontSize: fontSize.base,
  },
  actionCountLarge: {
    fontSize: fontSize.lg,
  },
});
