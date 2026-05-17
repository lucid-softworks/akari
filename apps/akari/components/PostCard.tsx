import React, { useCallback, useMemo, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import type { BlueskyEmbed, BlueskyLabel, BlueskyVerification } from '@/bluesky-api';
import { Labels } from '@/components/Labels';
import { PostComposer } from '@/components/PostComposer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { UnthreadEmbed } from '@/components/UnthreadEmbed';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { PressableLink } from '@/components/ui/PressableLink';
import { AdultContentGate } from '@/components/post/AdultContentGate';
import { LiveStreamEmbed } from '@/components/post/LiveStreamEmbed';
import { PostActions } from '@/components/post/PostActions';
import { PostActionsMenu } from '@/components/post/PostActionsMenu';
import { PostEmbeds } from '@/components/post/PostEmbeds';
import { PostHeader } from '@/components/post/PostHeader';
import { PostTranslation } from '@/components/post/PostTranslation';
import { resolveExternalThumb } from '@/utils/embedThumb';
import { findUnthreadFacet, parseUnthreadUrl, stripUnthreadFromPost } from '@/utils/unthread';
import { spacing, fontSize, fontWeight, opacity, activeOpacity, semanticColors, layout } from '@/constants/tokens';
import { useLiveNow } from '@/hooks/queries/useLiveNow';
import { useAdultContentDecision } from '@/hooks/useAdultContentDecision';
import { useHiddenContent } from '@/hooks/useHiddenContent';
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
      verification?: BlueskyVerification;
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
      replyDisabled?: boolean;
      embeddingDisabled?: boolean;
      bookmarked?: boolean;
    };
    facets?: {
      index: { byteStart: number; byteEnd: number };
      features: { $type: string; uri?: string; tag?: string }[];
    }[];
    uri?: string;
    cid?: string;
    feedContext?: string;
    /**
     * URI of the thread root when this post is itself a reply. Threading
     * through the raw `record.reply.root.uri`. When set, replying to this
     * post will preserve the original thread root in the new reply's
     * `record.reply.root` — without it the new reply would falsely claim
     * `root === parent`, which the official client renders as a stranded
     * post with no parent context.
     */
    threadRootUri?: string;
  };
  onPress?: () => void;
  href?: string;
  /** When set, post-actions menu shows "Show more / less like this"
   *  feedback rows that route to that feed gen. Pass the at:// URI of
   *  the feed the post was rendered from. */
  feedUri?: string;
};

export const PostCard = React.memo(function PostCard({ post, onPress, href, feedUri }: PostCardProps) {
  const { t } = useTranslation();

  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [showQuoteComposer, setShowQuoteComposer] = useState(false);
  const [isTranslationVisible, setIsTranslationVisible] = useState(false);
  const [translatedEmbed, setTranslatedEmbed] = useState<{ title?: string; description?: string } | null>(null);
  const [isCardHovered, setIsCardHovered] = useState(false);
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);

  const borderColor = useThemeColor({ light: '#e8eaed', dark: '#2d3133' }, 'background');
  const hoverBg = useThemeColor({}, 'hover');
  const iconColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'text');

  const authorName = post.author.displayName || post.author.handle;

  // Detect a post that links to an unthread.at long-form document. When
  // present we (1) strip the unthread link's byte range from the rendered
  // text + facets so the "View full post" CTA disappears, (2) suppress the
  // auto-generated external link card pointing at unthread.at, and
  // (3) render our own inline `UnthreadEmbed` expander after the text.
  const unthreadRef = useMemo(() => findUnthreadFacet(post.facets), [post.facets]);
  const cleanedPost = useMemo(() => {
    if (!unthreadRef || !post.text) return { text: post.text, facets: post.facets };
    return stripUnthreadFromPost(post.text, post.facets);
  }, [post.facets, post.text, unthreadRef]);
  const displayText = cleanedPost.text ?? post.text;
  const displayFacets = cleanedPost.facets ?? post.facets;
  const externalEmbedIsUnthread = useMemo(() => {
    const embed = post.embed as { $type?: string; external?: { uri?: string } } | undefined;
    if (!embed?.$type?.includes('app.bsky.embed.external')) return false;
    return parseUnthreadUrl(embed.external?.uri) !== null;
  }, [post.embed]);
  const renderEmbed = !externalEmbedIsUnthread;
  const hasText = Boolean(displayText && displayText.trim());
  const hasEmbed = renderEmbed && Boolean(post.embed || (post.embeds && post.embeds.length > 0));
  const canTranslate = hasText;

  // Locally-hidden posts / accounts disappear from any feed they show
  // up in. The hook must be invoked unconditionally to keep hook order
  // stable across renders — we apply the result in the render block
  // below.
  const { isHidden } = useHiddenContent();
  const hideThisCard = isHidden(post.uri, post.author.did);

  // Adult-content gate. Reads `adultContentPref` and the post's labels
  // to decide between showing normally, blurring with a reveal button,
  // or suppressing the post entirely. Suppression matches Bluesky's
  // behaviour when adult content is off — the post just disappears
  // from the feed.
  const adultDecision = useAdultContentDecision(post.labels);

  // Live stream detection
  const { data: liveNowEntries = [] } = useLiveNow();

  const liveExternalEmbed = useMemo(() => {
    const inspectEmbed = (embed?: BlueskyEmbed | null): { uri: string; title?: string; description?: string; thumb?: string } | null => {
      if (!embed) return null;
      if (embed.$type?.includes('app.bsky.embed.external') && embed.external?.uri) {
        // The AppView returns the `#view` shape where `thumb` is already
        // a fully-resolved string URL; the underlying record shape gives
        // a `{ ref: { $link } }` blob ref. resolveExternalThumb folds both.
        return {
          uri: embed.external.uri,
          title: embed.external.title,
          description: embed.external.description,
          thumb: resolveExternalThumb(embed.external.thumb),
        };
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
    setShowActionsMenu((prev) => !prev);
  }, []);

  const handleMenuDismiss = useCallback(() => {
    setShowActionsMenu(false);
  }, []);

  const handleReplyPress = useCallback(() => {
    setShowReplyComposer(true);
  }, []);

  const handleQuotePress = useCallback(() => {
    if (!post.uri || !post.cid) return;
    setShowQuoteComposer(true);
  }, [post.uri, post.cid]);

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

  const postBody = (
    <View style={hasText || hasEmbed || unthreadRef ? styles.content : undefined}>
      {unthreadRef ? (
        <UnthreadEmbed unthread={unthreadRef} fallbackText={displayText} />
      ) : hasText ? (
        <PostTranslation
          text={displayText!}
          visible={isTranslationVisible}
          onHide={handleHideTranslation}
          facets={displayFacets}
          textStyle={[styles.text, !hasEmbed && styles.textOnly]}
          embedText={post.embed?.external ? { title: post.embed.external.title, description: post.embed.external.description } : undefined}
          onEmbedTranslated={setTranslatedEmbed}
        />
      ) : null}

      {/* Inline live-stream player. The bsky live-now config flags certain
          accounts as currently broadcasting; when their post embeds a link
          to one of their registered domains we lift it into a full inline
          player above the link card. */}
      {isLive && liveStreamInfo ? <LiveStreamEmbed info={liveStreamInfo} /> : null}

      {hasEmbed ? <PostEmbeds postId={post.id} embed={post.embed} embeds={post.embeds} translatedEmbed={translatedEmbed} /> : null}
    </View>
  );

  const postContent = (
    <>
      {/* Reply Context */}
      {post.replyTo && (
        <View style={styles.replyContext}>
          <IconSymbol name="arrowshape.turn.up.left" size={12} color={iconColor} style={styles.replyIcon} />
          <ThemedText style={styles.replyText}>{t('ui.replyingTo', { handle: post.replyTo.author.handle })}</ThemedText>
          <ThemedText style={styles.replyPreview} numberOfLines={1}>
            {post.replyTo.text}
          </ThemedText>
        </View>
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
        onAvatarHoverChange={handleAvatarHoverChange}
      />

      {adultDecision.action === 'warn' ? (
        <AdultContentGate matchedLabels={adultDecision.matchedLabels}>{postBody}</AdultContentGate>
      ) : (
        postBody
      )}

      <Labels labels={post.labels} maxLabels={3} />
    </>
  );

  const actionsBar = (
    <View style={styles.actionsContainer}>
      <PostActions
        uri={post.uri}
        cid={post.cid}
        likeUri={post.viewer?.like}
        repostUri={post.viewer?.repost}
        isBookmarked={post.viewer?.bookmarked}
        replyDisabled={post.viewer?.replyDisabled}
        authorHandle={post.author.handle}
        authorName={authorName}
        commentCount={post.commentCount || 0}
        repostCount={post.repostCount || 0}
        likeCount={post.likeCount || 0}
        onReplyPress={handleReplyPress}
        onMorePress={handleMenuToggle}
        onQuotePress={handleQuotePress}
      />
      <PostActionsMenu
        visible={showActionsMenu}
        canTranslate={canTranslate}
        postText={post.text}
        postUri={post.uri}
        postCid={post.cid}
        authorDid={post.author.did}
        feedUri={feedUri}
        feedContext={post.feedContext}
        onDismiss={handleMenuDismiss}
        onTranslatePress={handleTranslatePress}
      />
    </View>
  );

  if (hideThisCard) return null;
  if (adultDecision.action === 'hide') return null;

  return (
    <>
      {onPress || href ? (
        <View
          style={[styles.container, { borderBottomColor: borderColor }, isCardHovered && { backgroundColor: hoverBg }]}
          onPointerEnter={() => setIsCardHovered(true)}
          onPointerLeave={() => setIsCardHovered(false)}
        >
          <PressableLink
            href={href ?? '#'}
            onPress={onPress}
          >
            {postContent}
          </PressableLink>
          {actionsBar}
        </View>
      ) : (
        <ThemedView style={[styles.container, { borderBottomColor: borderColor }]}>
          {postContent}
          {actionsBar}
        </ThemedView>
      )}

      <PostComposer
        visible={showReplyComposer}
        onClose={() => setShowReplyComposer(false)}
        replyTo={{
          root: post.threadRootUri || post.uri || '',
          parent: post.uri || '',
          authorHandle: post.author.handle,
          preview: {
            text: post.text,
            author: {
              handle: post.author.handle,
              displayName: post.author.displayName,
              avatar: post.author.avatar,
            },
            embed: post.embed,
            embeds: post.embeds,
            facets: post.facets,
          },
        }}
      />

      {post.uri && post.cid ? (
        <PostComposer
          visible={showQuoteComposer}
          onClose={() => setShowQuoteComposer(false)}
          quote={{
            uri: post.uri,
            cid: post.cid,
            text: post.text,
            author: {
              handle: post.author.handle,
              displayName: post.author.displayName,
              avatar: post.author.avatar,
            },
            indexedAt: post.createdAt,
            embed: post.embed,
            embeds: post.embeds,
            facets: post.facets,
          }}
        />
      ) : null}
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
  const { Image } = require('@/components/Image');
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
          <Pressable style={({ pressed }) => [styles.livePreviewPrimaryButton, pressed && { opacity: activeOpacity.subtle }]} onPress={onWatchLive} >
            <ThemedText style={styles.livePreviewPrimaryButtonText}>{t('common.watchNow')}</ThemedText>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.livePreviewSecondaryButton, { borderColor }, pressed && { opacity: activeOpacity.subtle }]} onPress={() => navigateToProfile({})} >
            <ThemedText style={styles.livePreviewSecondaryButtonText}>{t('common.openProfile')}</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: layout.hairline,
  },
  actionsContainer: {
    position: 'relative',
  },
  replyContext: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  replyIcon: {
    fontSize: fontSize.sm,
    marginRight: spacing.xs,
  },
  replyText: {
    fontSize: fontSize.sm,
    opacity: opacity.secondary,
    flex: 1,
  },
  replyPreview: {
    fontSize: fontSize.xs,
    opacity: opacity.tertiary,
    fontStyle: 'italic',
    flex: 1,
    marginLeft: spacing.sm,
  },
  content: {
    marginBottom: spacing.sm,
  },
  text: {
    fontSize: fontSize.lg,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  textOnly: {
    marginBottom: 0,
  },
  livePreviewContainer: {
    position: 'absolute',
    top: -spacing.lg,
    left: spacing.lg,
    zIndex: 50,
    width: 260,
  },
  livePreviewCard: {
    borderWidth: layout.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  livePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePreviewIndicator: {
    width: spacing.sm,
    height: spacing.sm,
    borderRadius: spacing.xs,
    backgroundColor: semanticColors.live,
  },
  livePreviewIndicatorLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: semanticColors.live,
    letterSpacing: 0.6,
  },
  livePreviewThumbnail: {
    width: '100%',
    height: 140,
    backgroundColor: '#000000',
  },
  livePreviewTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  livePreviewDescription: {
    fontSize: fontSize.md,
    opacity: opacity.secondary,
    lineHeight: 18,
  },
  livePreviewDomain: {
    fontSize: fontSize.sm,
    opacity: 0.6,
  },
  livePreviewActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  livePreviewPrimaryButton: {
    flex: 1,
    backgroundColor: semanticColors.live,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  livePreviewPrimaryButtonText: {
    color: '#ffffff',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  livePreviewSecondaryButton: {
    flex: 1,
    borderWidth: layout.border,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  livePreviewSecondaryButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});
