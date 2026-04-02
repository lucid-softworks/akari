import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Linking, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';

import type { BlueskyEmbed, BlueskyLabel } from '@/bluesky-api';
import { Labels } from '@/components/Labels';
import { PostComposer } from '@/components/PostComposer';
import { RichTextWithFacets } from '@/components/RichTextWithFacets';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { PostActions } from '@/components/post/PostActions';
import { PostActionsMenu } from '@/components/post/PostActionsMenu';
import { PostEmbeds } from '@/components/post/PostEmbeds';
import { PostHeader } from '@/components/post/PostHeader';
import { PostTranslation } from '@/components/post/PostTranslation';
import { useLiveNow } from '@/hooks/queries/useLiveNow';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

export type PostCardProps = {
  post: {
    id: string;
    text?: string;
    author: {
      did: string;
      handle: string;
      displayName?: string;
      avatar?: string;
    };
    createdAt: string;
    likeCount?: number;
    commentCount?: number;
    repostCount?: number;
    embed?: BlueskyEmbed;
    embeds?: BlueskyEmbed[];
    replyTo?: {
      author: {
        handle: string;
        displayName?: string;
      };
      text?: string;
    };
    labels?: BlueskyLabel[];
    viewer?: {
      like?: string;
      repost?: string;
      reply?: string;
    };
    facets?: {
      index: { byteStart: number; byteEnd: number };
      features: { $type: string; uri?: string; tag?: string }[];
    }[];
    uri?: string;
    cid?: string;
  };
  onPress?: () => void;
};

export const PostCard = React.memo(function PostCard({ post, onPress }: PostCardProps) {
  const { t } = useTranslation();

  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [isTranslationVisible, setIsTranslationVisible] = useState(false);
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);

  const menuButtonRef = useRef<any>(null);

  const borderColor = useThemeColor({ light: '#e8eaed', dark: '#2d3133' }, 'background');
  const iconColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'text');

  const authorName = post.author.displayName || post.author.handle;
  const canTranslate = Boolean(post.text && post.text.trim());

  // Live stream detection
  const { data: liveNowEntries = [] } = useLiveNow();

  const liveExternalEmbed = useMemo(() => {
    const inspectEmbed = (embed?: BlueskyEmbed | null): { uri: string; title?: string; description?: string; thumb?: string } | null => {
      if (!embed) return null;
      if (embed.$type?.includes('app.bsky.embed.external') && embed.external?.uri) {
        return { uri: embed.external.uri, title: embed.external.title, description: embed.external.description, thumb: embed.external.thumb?.ref?.$link };
      }
      if (embed.media) {
        const r = inspectEmbed(embed.media as unknown as BlueskyEmbed);
        if (r) return r;
      }
      if (embed.record?.embed) {
        const r = inspectEmbed(embed.record.embed as unknown as BlueskyEmbed);
        if (r) return r;
      }
      if (embed.record?.embeds) {
        for (const nested of embed.record.embeds) {
          const r = inspectEmbed(nested as unknown as BlueskyEmbed);
          if (r) return r;
        }
      }
      return null;
    };
    const direct = inspectEmbed(post.embed);
    if (direct) return direct;
    if (post.embeds) {
      for (const embed of post.embeds) {
        const result = inspectEmbed(embed);
        if (result) return result;
      }
    }
    return null;
  }, [post.embed, post.embeds]);

  const liveStreamInfo = useMemo(() => {
    if (!post.author.did || !liveExternalEmbed?.uri) return null;
    const entry = liveNowEntries.find((item) => item.did === post.author.did);
    if (!entry) return null;
    let hostname: string;
    try {
      hostname = new URL(liveExternalEmbed.uri).hostname.toLowerCase();
    } catch {
      return null;
    }
    const normalizedHost = hostname.replace(/^www\./, '');
    const matchesDomain = entry.domains.some((domain) => {
      const nd = domain.toLowerCase().replace(/^www\./, '');
      return normalizedHost === nd || normalizedHost.endsWith(`.${nd}`);
    });
    if (!matchesDomain) return null;
    return { uri: liveExternalEmbed.uri, title: liveExternalEmbed.title, description: liveExternalEmbed.description, thumbnail: liveExternalEmbed.thumb, domain: normalizedHost };
  }, [liveNowEntries, liveExternalEmbed, post.author.did]);

  const isLive = Boolean(liveStreamInfo);

  // Handlers
  const handleMenuToggle = useCallback(() => {
    if (showActionsMenu) {
      setShowActionsMenu(false);
      return;
    }
    // Always open the menu, and try to get position for proper placement
    setShowActionsMenu(true);
    const button = menuButtonRef.current;
    if (button?.measureInWindow) {
      button.measureInWindow((x: number, y: number, width: number, height: number) => {
        setMenuPosition({ x, y, width, height });
      });
    } else {
      setMenuPosition(null);
    }
  }, [showActionsMenu]);

  const handleMenuDismiss = useCallback(() => {
    setShowActionsMenu(false);
  }, []);

  const handleReplyPress = useCallback(() => {
    setShowReplyComposer(true);
  }, []);

  const handleTranslatePress = useCallback(() => {
    setShowActionsMenu(false);
    setIsTranslationVisible(true);
  }, []);

  const handleHideTranslation = useCallback(() => {
    setIsTranslationVisible(false);
  }, []);

  const handleAvatarHoverChange = useCallback((hovered: boolean) => {
    setIsAvatarHovered(hovered);
  }, []);

  const handleWatchLive = useCallback(() => {
    if (!liveStreamInfo?.uri) return;
    void Linking.openURL(liveStreamInfo.uri).catch((error) => {
      if (__DEV__) console.warn('Failed to open live stream', error);
    });
  }, [liveStreamInfo?.uri]);

  const showLivePreview = Platform.OS === 'web' && isLive && isAvatarHovered;

  const menuBackgroundColor = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');

  const postContent = (
    <>
      {/* Reply Context */}
      {post.replyTo && (
        <ThemedView style={styles.replyContext}>
          <IconSymbol name="arrowshape.turn.up.left" size={12} color={iconColor} style={styles.replyIcon} />
          <ThemedText style={styles.replyText}>{t('ui.replyingTo', { handle: post.replyTo.author.handle })}</ThemedText>
          <ThemedText style={styles.replyPreview} numberOfLines={1}>
            {post.replyTo.text}
          </ThemedText>
        </ThemedView>
      )}

      {/* Live Preview (web only) */}
      {showLivePreview && liveStreamInfo && (
        <LivePreview
          liveStreamInfo={liveStreamInfo}
          menuBackgroundColor={menuBackgroundColor}
          borderColor={borderColor}
          onAvatarHoverChange={handleAvatarHoverChange}
          onWatchLive={handleWatchLive}
        />
      )}

      <PostHeader
        author={post.author}
        createdAt={post.createdAt}
        isLive={isLive}
        onMenuToggle={handleMenuToggle}
        menuButtonRef={menuButtonRef}
        onAvatarHoverChange={handleAvatarHoverChange}
      />

      <ThemedView style={styles.content}>
        <RichTextWithFacets text={post.text || ''} facets={post.facets} style={styles.text} />

        <PostTranslation
          text={post.text || ''}
          visible={isTranslationVisible}
          onHide={handleHideTranslation}
        />

        <PostEmbeds postId={post.id} embed={post.embed} embeds={post.embeds} />
      </ThemedView>

      <Labels labels={post.labels} maxLabels={3} />

      <PostActions
        uri={post.uri}
        cid={post.cid}
        likeUri={post.viewer?.like}
        authorName={authorName}
        commentCount={post.commentCount || 0}
        repostCount={post.repostCount || 0}
        likeCount={post.likeCount || 0}
        onReplyPress={handleReplyPress}
      />
    </>
  );

  return (
    <>
      {onPress ? (
        <TouchableOpacity
          style={[styles.container, { borderBottomColor: borderColor }]}
          onPress={onPress}
          activeOpacity={0.7}
        >
          {postContent}
        </TouchableOpacity>
      ) : (
        <ThemedView style={[styles.container, { borderBottomColor: borderColor }]}>
          {postContent}
        </ThemedView>
      )}

      <PostActionsMenu
        visible={showActionsMenu}
        menuPosition={menuPosition}
        canTranslate={canTranslate}
        onDismiss={handleMenuDismiss}
        onTranslatePress={handleTranslatePress}
      />

      <PostComposer
        visible={showReplyComposer}
        onClose={() => setShowReplyComposer(false)}
        replyTo={{
          root: post.uri || '',
          parent: post.uri || '',
          authorHandle: post.author.handle,
        }}
      />
    </>
  );
});

// Lightweight live preview sub-component (web only)
const LivePreview = React.memo(function LivePreview({
  liveStreamInfo,
  menuBackgroundColor,
  borderColor,
  onAvatarHoverChange,
  onWatchLive,
}: {
  liveStreamInfo: { uri: string; title?: string; description?: string; thumbnail?: string; domain: string };
  menuBackgroundColor: string;
  borderColor: string;
  onAvatarHoverChange: (hovered: boolean) => void;
  onWatchLive: () => void;
}) {
  const { Image } = require('expo-image');
  const { t } = useTranslation();
  const { useNavigateToProfile } = require('@/utils/navigation');
  const navigateToProfile = useNavigateToProfile();

  return (
    <View
      style={styles.livePreviewContainer}
      onPointerEnter={() => onAvatarHoverChange(true)}
      onPointerLeave={() => onAvatarHoverChange(false)}
    >
      <ThemedView style={[styles.livePreviewCard, { backgroundColor: menuBackgroundColor, borderColor }]} accessibilityRole="menu">
        <View style={styles.livePreviewHeader}>
          <View style={styles.livePreviewIndicator} />
          <ThemedText style={styles.livePreviewIndicatorLabel}>{t('common.live')}</ThemedText>
        </View>
        {liveStreamInfo.thumbnail && (
          <Image source={{ uri: liveStreamInfo.thumbnail }} style={styles.livePreviewThumbnail} contentFit="cover" />
        )}
        {liveStreamInfo.title && (
          <ThemedText style={styles.livePreviewTitle} numberOfLines={2}>{liveStreamInfo.title}</ThemedText>
        )}
        {liveStreamInfo.description && (
          <ThemedText style={styles.livePreviewDescription} numberOfLines={2}>{liveStreamInfo.description}</ThemedText>
        )}
        <ThemedText style={styles.livePreviewDomain}>{liveStreamInfo.domain}</ThemedText>
        <View style={styles.livePreviewActions}>
          <TouchableOpacity style={styles.livePreviewPrimaryButton} onPress={onWatchLive} activeOpacity={0.8}>
            <ThemedText style={styles.livePreviewPrimaryButtonText}>{t('common.watchNow')}</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.livePreviewSecondaryButton, { borderColor }]} onPress={() => navigateToProfile({})} activeOpacity={0.8}>
            <ThemedText style={styles.livePreviewSecondaryButtonText}>{t('common.openProfile')}</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </View>
  );
});

const LIVE_ACCENT_COLOR = '#ff274c';

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    position: 'relative',
  },
  replyContext: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  replyIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  replyText: {
    fontSize: 12,
    opacity: 0.7,
    flex: 1,
  },
  replyPreview: {
    fontSize: 11,
    opacity: 0.5,
    fontStyle: 'italic',
    flex: 1,
    marginLeft: 8,
  },
  content: {
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  livePreviewContainer: {
    position: 'absolute',
    top: -16,
    left: 16,
    zIndex: 50,
    width: 260,
  },
  livePreviewCard: {
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  livePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePreviewIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: LIVE_ACCENT_COLOR,
  },
  livePreviewIndicatorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: LIVE_ACCENT_COLOR,
    letterSpacing: 0.6,
  },
  livePreviewThumbnail: {
    width: '100%',
    height: 140,
    backgroundColor: '#000000',
  },
  livePreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  livePreviewDescription: {
    fontSize: 13,
    opacity: 0.7,
    lineHeight: 18,
  },
  livePreviewDomain: {
    fontSize: 12,
    opacity: 0.6,
  },
  livePreviewActions: {
    flexDirection: 'row',
    gap: 8,
  },
  livePreviewPrimaryButton: {
    flex: 1,
    backgroundColor: LIVE_ACCENT_COLOR,
    paddingVertical: 8,
    alignItems: 'center',
  },
  livePreviewPrimaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  livePreviewSecondaryButton: {
    flex: 1,
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  livePreviewSecondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
