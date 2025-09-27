import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { BlueskyEmbed, BlueskyImage, BlueskyLabel } from '@/bluesky-api';
import { ExternalEmbed } from '@/components/ExternalEmbed';
import { GifEmbed } from '@/components/GifEmbed';
import { ImageViewer } from '@/components/ImageViewer';
import { Labels } from '@/components/Labels';
import { PostComposer } from '@/components/PostComposer';
import { RecordEmbed } from '@/components/RecordEmbed';
import { RichTextWithFacets } from '@/components/RichTextWithFacets';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { VideoEmbed } from '@/components/VideoEmbed';
import { YouTubeEmbed } from '@/components/YouTubeEmbed';
import { useLikePost } from '@/hooks/mutations/useLikePost';
import { usePostTranslation } from '@/hooks/mutations/usePostTranslation';
import { useSummarizeThread } from '@/hooks/mutations/useSummarizeThread';
import { useLibreTranslateLanguages } from '@/hooks/queries/useLibreTranslateLanguages';
import { useLiveNow } from '@/hooks/queries/useLiveNow';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { DEFAULT_LIBRETRANSLATE_LANGUAGES, type LibreTranslateLanguage } from '@/utils/libretranslate';

type PostCardProps = {
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
    embeds?: BlueskyEmbed[]; // Added embeds field
    /** Reply context - what this post is replying to */
    replyTo?: {
      author: {
        handle: string;
        displayName?: string;
      };
      text?: string;
    };
    /** Labels applied to the post */
    labels?: BlueskyLabel[];
    /** Viewer's interaction with the post */
    viewer?: {
      like?: string;
      repost?: string;
      reply?: string;
    };
    /** Facets for rich text rendering */
    facets?: {
      index: {
        byteStart: number;
        byteEnd: number;
      };
      features: {
        $type: string;
        uri?: string;
        tag?: string;
      }[];
    }[];
    /** Post URI and CID for like functionality */
    uri?: string;
    cid?: string;
  };
  onPress?: () => void;
};

const LANGUAGE_CODE_ALIASES: Record<string, string> = {
  'zh-cn': 'zh',
  'zh-hans': 'zh',
  'zh-sg': 'zh',
  'zh-hk': 'zh',
  'zh-tw': 'zh',
  'zh-hant': 'zh',
  'pt-br': 'pt',
  'pt-pt': 'pt',
  'en-us': 'en',
  'en-gb': 'en',
  'en-au': 'en',
  'en-ca': 'en',
  'es-mx': 'es',
  'es-es': 'es',
};

const normalizeLanguageCode = (code: string) => {
  const lower = code.toLowerCase();
  if (LANGUAGE_CODE_ALIASES[lower]) {
    return LANGUAGE_CODE_ALIASES[lower];
  }

  if (lower.includes('-')) {
    const [base] = lower.split('-');
    return LANGUAGE_CODE_ALIASES[base] ?? base;
  }

  return lower;
};

const resolveLanguageCode = (locale: string | undefined, languages: LibreTranslateLanguage[]) => {
  const fallback = languages.find((language) => language.code === 'en')?.code || languages[0]?.code || 'en';

  if (!locale) {
    return fallback;
  }

  const normalized = normalizeLanguageCode(locale);

  if (languages.some((language) => language.code === normalized)) {
    return normalized;
  }

  const alias = LANGUAGE_CODE_ALIASES[normalized];
  if (alias && languages.some((language) => language.code === alias)) {
    return alias;
  }

  const [base] = normalized.split('-');
  if (languages.some((language) => language.code === base)) {
    return base;
  }

  return fallback;
};

type PostMenuItem =
  | {
      key: string;
      label: string;
      onPress: () => void;
      destructive?: boolean;
      disabled?: boolean;
    }
  | { key: string; type: 'separator' };

type ExternalLiveEmbed = {
  uri: string;
  title?: string;
  description?: string;
  thumb?: string;
};

const LIVE_ACCENT_COLOR = '#ff274c';

export function PostCard({ post, onPress }: PostCardProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{
    [key: string]: { width: number; height: number };
  }>({});
  const { t, currentLocale } = useTranslation();
  const likeMutation = useLikePost();
  const translationMutation = usePostTranslation();
  const summaryMutation = useSummarizeThread();

  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const menuButtonRef = useRef<TouchableOpacity | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const [isTranslationVisible, setIsTranslationVisible] = useState(false);
  const [isLanguagePickerVisible, setIsLanguagePickerVisible] = useState(false);
  const [hasUserSelectedLanguage, setHasUserSelectedLanguage] = useState(false);
  const [translationCache, setTranslationCache] = useState<Record<string, string>>({});
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState(() =>
    resolveLanguageCode(currentLocale, DEFAULT_LIBRETRANSLATE_LANGUAGES),
  );
  const [isSummaryVisible, setIsSummaryVisible] = useState(false);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);

  const postUri = post.uri ?? post.id;
  const { data: liveNowEntries = [] } = useLiveNow();

  const liveExternalEmbed = useMemo<ExternalLiveEmbed | null>(() => {
    const inspectEmbed = (embed?: BlueskyEmbed | null): ExternalLiveEmbed | null => {
      if (!embed) {
        return null;
      }

      if (embed.$type?.includes('app.bsky.embed.external') && embed.external?.uri) {
        return {
          uri: embed.external.uri,
          title: embed.external.title,
          description: embed.external.description,
          thumb: embed.external.thumb?.ref?.$link,
        };
      }

      if (embed.media) {
        const mediaResult = inspectEmbed(embed.media as unknown as BlueskyEmbed);
        if (mediaResult) {
          return mediaResult;
        }
      }

      if (embed.record?.embed) {
        const recordEmbed = inspectEmbed(embed.record.embed as unknown as BlueskyEmbed);
        if (recordEmbed) {
          return recordEmbed;
        }
      }

      if (embed.record?.embeds) {
        for (const nested of embed.record.embeds) {
          const nestedResult = inspectEmbed(nested as unknown as BlueskyEmbed);
          if (nestedResult) {
            return nestedResult;
          }
        }
      }

      return null;
    };

    const direct = inspectEmbed(post.embed);
    if (direct) {
      return direct;
    }

    if (post.embeds) {
      for (const embed of post.embeds) {
        const result = inspectEmbed(embed);
        if (result) {
          return result;
        }
      }
    }

    return null;
  }, [post.embed, post.embeds]);

  const liveStreamInfo = useMemo(() => {
    if (!post.author.did || !liveExternalEmbed?.uri) {
      return null;
    }

    const entry = liveNowEntries.find((item) => item.did === post.author.did);
    if (!entry) {
      return null;
    }

    let hostname: string;
    try {
      hostname = new URL(liveExternalEmbed.uri).hostname.toLowerCase();
    } catch {
      return null;
    }

    const normalizedHost = hostname.replace(/^www\./, '');

    const matchesDomain = entry.domains.some((domain) => {
      const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
      return normalizedHost === normalizedDomain || normalizedHost.endsWith(`.${normalizedDomain}`);
    });

    if (!matchesDomain) {
      return null;
    }

    return {
      uri: liveExternalEmbed.uri,
      title: liveExternalEmbed.title,
      description: liveExternalEmbed.description,
      thumbnail: liveExternalEmbed.thumb,
      domain: normalizedHost,
    };
  }, [liveNowEntries, liveExternalEmbed, post.author.did]);

  useEffect(() => {
    setIsSummaryVisible(false);
    setSummaryText(null);
    setSummaryError(null);
    summaryMutation.reset();
  }, [postUri, summaryMutation]);

  const liveStreamUri = liveStreamInfo?.uri;
  const isLive = Boolean(liveStreamInfo);

  const handleAvatarPointerEnter = useCallback(() => {
    if (Platform.OS === 'web') {
      setIsAvatarHovered(true);
    }
  }, []);

  const handleAvatarPointerLeave = useCallback(() => {
    if (Platform.OS === 'web') {
      setIsAvatarHovered(false);
    }
  }, []);

  const showLivePreview = Platform.OS === 'web' && isLive && isAvatarHovered;

  const handleWatchLive = useCallback(() => {
    if (!liveStreamUri) {
      return;
    }

    void Linking.openURL(liveStreamUri).catch((error) => {
      if (__DEV__) {
        console.warn('Failed to open live stream', error);
      }
    });
  }, [liveStreamUri]);

  const languagesQuery = useLibreTranslateLanguages(isLanguagePickerVisible || isTranslationVisible);
  const languages = languagesQuery.data?.languages ?? DEFAULT_LIBRETRANSLATE_LANGUAGES;

  useEffect(() => {
    const resolvedLanguage = resolveLanguageCode(currentLocale, languages);

    if (!languages.some((language) => language.code === selectedLanguage)) {
      if (selectedLanguage !== resolvedLanguage) {
        setSelectedLanguage(resolvedLanguage);
      }

      return;
    }

    if (!hasUserSelectedLanguage && selectedLanguage !== resolvedLanguage) {
      setSelectedLanguage(resolvedLanguage);
    }
  }, [currentLocale, hasUserSelectedLanguage, languages, selectedLanguage]);

  const languageNameMap = useMemo(
    () => new Map(languages.map((language) => [language.code, language.name])),
    [languages],
  );

  const selectedLanguageName = languageNameMap.get(selectedLanguage) ?? selectedLanguage.toUpperCase();

  const authorName = post.author.displayName || post.author.handle;

  const borderColor = useThemeColor(
    {
      light: '#e8eaed',
      dark: '#2d3133',
    },
    'background',
  );

  const iconColor = useThemeColor(
    {
      light: '#687076',
      dark: '#9BA1A6',
    },
    'text',
  );

  const menuBackgroundColor = useThemeColor(
    {
      light: '#ffffff',
      dark: '#1c1c1e',
    },
    'background',
  );

  const dividerColor = useThemeColor(
    {
      light: 'rgba(0, 0, 0, 0.08)',
      dark: 'rgba(255, 255, 255, 0.16)',
    },
    'background',
  );

  const translationBackgroundColor = useThemeColor(
    {
      light: '#f1f3f5',
      dark: '#1f2123',
    },
    'background',
  );

  const summaryBackgroundColor = useThemeColor(
    {
      light: '#f6f6f6',
      dark: '#181a1d',
    },
    'background',
  );

  const summaryBorderColor = useThemeColor(
    {
      light: 'rgba(0, 0, 0, 0.08)',
      dark: 'rgba(255, 255, 255, 0.12)',
    },
    'background',
  );

  const summaryTextColor = useThemeColor(
    {
      light: '#1d1d1f',
      dark: '#f2f2f7',
    },
    'text',
  );

  const summaryErrorColor = useThemeColor(
    {
      light: '#b00020',
      dark: '#ff453a',
    },
    'text',
  );

  const modalBackgroundColor = useThemeColor(
    {
      light: '#ffffff',
      dark: '#1c1c1e',
    },
    'background',
  );

  const canTranslate = Boolean(post.text && post.text.trim());
  const isTranslating = translationMutation.isPending;
  const isSummarizing = summaryMutation.isPending;

  const menuStyle = useMemo(() => {
    const fallbackPosition = { top: 16, right: 16 };

    if (!menuPosition) {
      return fallbackPosition;
    }

    const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
    const estimatedHeight = 440;

    let top = menuPosition.y + menuPosition.height + 4;
    if (top + estimatedHeight > windowHeight) {
      top = Math.max(16, menuPosition.y - estimatedHeight);
    }

    const right = Math.max(8, windowWidth - (menuPosition.x + menuPosition.width));

    return { top, right };
  }, [menuPosition]);

  const handleMenuToggle = useCallback(() => {
    if (showActionsMenu) {
      setShowActionsMenu(false);
      return;
    }

    const button = menuButtonRef.current;

    if (button?.measureInWindow) {
      button.measureInWindow((x, y, width, height) => {
        setMenuPosition({ x, y, width, height });
        setShowActionsMenu(true);
      });
      return;
    }

    setMenuPosition(null);
    setShowActionsMenu(true);
  }, [showActionsMenu]);

  const handleMenuDismiss = useCallback(() => {
    setShowActionsMenu(false);
  }, []);

  const handlePlaceholderAction = useCallback((actionKey: string) => {
    setShowActionsMenu(false);

    if (__DEV__) {
      console.info(`[PostCard] Action "${actionKey}" is not implemented yet.`);
    }
  }, []);

  const performTranslation = useCallback(
    async (targetLanguage: string) => {
      if (!post.text || !post.text.trim()) {
        setTranslationError(t('post.translation.noText'));
        return;
      }

      setTranslationError(null);

      try {
        const { translatedText } = await translationMutation.mutateAsync({
          text: post.text,
          targetLanguage,
        });

        setTranslationCache((previous) => ({
          ...previous,
          [targetLanguage]: translatedText,
        }));
      } catch (error) {
        const errorMessage = error instanceof Error && error.message ? error.message : null;

        if (__DEV__) {
          console.warn('Failed to translate post', error);
        }

        setTranslationError(
          errorMessage ? `${t('post.translation.error')} (${errorMessage})` : t('post.translation.error'),
        );
      }
    },
    [post.text, t, translationMutation],
  );

  const handleTranslatePress = useCallback(() => {
    setShowActionsMenu(false);

    if (!canTranslate) {
      setIsTranslationVisible(true);
      setTranslationError(t('post.translation.noText'));
      return;
    }

    if (isTranslationVisible) {
      setIsLanguagePickerVisible(true);
      return;
    }

    setIsTranslationVisible(true);

    if (!translationCache[selectedLanguage]) {
      void performTranslation(selectedLanguage);
    }
  }, [canTranslate, isTranslationVisible, performTranslation, selectedLanguage, translationCache, t]);

  const handleLanguageSelect = useCallback(
    (languageCode: string) => {
      setSelectedLanguage(languageCode);
      setHasUserSelectedLanguage(true);
      setIsLanguagePickerVisible(false);

      if (translationCache[languageCode]) {
        setTranslationError(null);
        return;
      }

      void performTranslation(languageCode);
    },
    [performTranslation, translationCache],
  );

  const handleHideTranslation = useCallback(() => {
    setIsTranslationVisible(false);
    setTranslationError(null);
    translationMutation.reset();
  }, [translationMutation]);

  useEffect(() => {
    if (!isTranslationVisible || !canTranslate) {
      return;
    }

    if (translationCache[selectedLanguage] || translationMutation.isPending) {
      return;
    }

    void performTranslation(selectedLanguage);
  }, [
    canTranslate,
    isTranslationVisible,
    performTranslation,
    selectedLanguage,
    translationCache,
    translationMutation.isPending,
  ]);

  const getSummaryErrorMessage = useCallback(
    (error: unknown) => {
      if (error instanceof Error) {
        if (error.message === 'appleUnavailable') {
          return t('post.summary.unavailable');
        }

        if (error.message === 'noText') {
          return t('post.summary.noText');
        }
      }

      return t('post.summary.error');
    },
    [t],
  );

  const runSummary = useCallback(() => {
    if (!postUri || summaryMutation.isPending) {
      return;
    }

    setSummaryError(null);

    summaryMutation
      .mutateAsync({ postUri })
      .then(({ summary }) => {
        setSummaryText(summary);
        setSummaryError(null);
      })
      .catch((error) => {
        setSummaryText(null);
        setSummaryError(getSummaryErrorMessage(error));
      });
  }, [getSummaryErrorMessage, postUri, summaryMutation]);

  const handleSummarizePress = useCallback(() => {
    setShowActionsMenu(false);

    if (!postUri) {
      setIsSummaryVisible(true);
      setSummaryError(t('post.summary.noText'));
      return;
    }

    setIsSummaryVisible(true);

    if (summaryText || summaryMutation.isPending) {
      return;
    }

    runSummary();
  }, [postUri, runSummary, summaryMutation.isPending, summaryText, t]);

  const handleHideSummary = useCallback(() => {
    setIsSummaryVisible(false);
  }, []);

  const handleRetrySummary = useCallback(() => {
    if (!postUri) {
      setSummaryError(t('post.summary.noText'));
      return;
    }

    setSummaryText(null);
    setSummaryError(null);
    summaryMutation.reset();
    runSummary();
  }, [postUri, runSummary, summaryMutation, t]);

  const menuActions = useMemo<PostMenuItem[]>(
    () => [
      { key: 'translate', label: t('post.actions.translate'), onPress: handleTranslatePress, disabled: !canTranslate },
      {
        key: 'summarizeThread',
        label: t('post.actions.summarizeThread'),
        onPress: handleSummarizePress,
        disabled: !postUri,
      },
      { key: 'copyText', label: t('post.actions.copyText'), onPress: () => handlePlaceholderAction('copyText') },
      { key: 'separator-1', type: 'separator' },
      {
        key: 'showMoreLikeThis',
        label: t('post.actions.showMoreLikeThis'),
        onPress: () => handlePlaceholderAction('showMoreLikeThis'),
      },
      {
        key: 'showLessLikeThis',
        label: t('post.actions.showLessLikeThis'),
        onPress: () => handlePlaceholderAction('showLessLikeThis'),
      },
      {
        key: 'assignToLists',
        label: t('post.actions.assignToLists'),
        onPress: () => handlePlaceholderAction('assignToLists'),
      },
      { key: 'separator-2', type: 'separator' },
      { key: 'muteThread', label: t('post.actions.muteThread'), onPress: () => handlePlaceholderAction('muteThread') },
      {
        key: 'muteWordsAndTags',
        label: t('post.actions.muteWordsAndTags'),
        onPress: () => handlePlaceholderAction('muteWordsAndTags'),
      },
      { key: 'separator-3', type: 'separator' },
      { key: 'hidePost', label: t('post.actions.hidePost'), onPress: () => handlePlaceholderAction('hidePost') },
      { key: 'hideAccount', label: t('post.actions.hideAccount'), onPress: () => handlePlaceholderAction('hideAccount') },
      { key: 'separator-4', type: 'separator' },
      { key: 'muteAccount', label: t('profile.muteAccount'), onPress: () => handlePlaceholderAction('muteAccount') },
      {
        key: 'blockAccount',
        label: t('common.block'),
        onPress: () => handlePlaceholderAction('blockAccount'),
        destructive: true,
      },
      {
        key: 'reportAccount',
        label: t('profile.reportAccount'),
        onPress: () => handlePlaceholderAction('reportAccount'),
        destructive: true,
      },
    ],
    [canTranslate, handlePlaceholderAction, handleSummarizePress, handleTranslatePress, postUri, t],
  );

  const handleProfilePress = () => {
    router.push(`/profile/${encodeURIComponent(post.author.handle)}`);
  };

  const livePreview = showLivePreview && liveStreamInfo
    ? (
        <View
          style={styles.livePreviewContainer}
          onPointerEnter={handleAvatarPointerEnter}
          onPointerLeave={handleAvatarPointerLeave}
        >
          <ThemedView
            style={[styles.livePreviewCard, { backgroundColor: menuBackgroundColor, borderColor }]}
            accessibilityRole="menu"
          >
            <View style={styles.livePreviewHeader}>
              <View style={styles.livePreviewIndicator} />
              <ThemedText style={styles.livePreviewIndicatorLabel}>{t('common.live')}</ThemedText>
            </View>
            {liveStreamInfo.thumbnail && (
              <Image
                source={{ uri: liveStreamInfo.thumbnail }}
                style={styles.livePreviewThumbnail}
                contentFit="cover"
                placeholder={require('@/assets/images/partial-react-logo.png')}
              />
            )}
            {liveStreamInfo.title && (
              <ThemedText style={styles.livePreviewTitle} numberOfLines={2}>
                {liveStreamInfo.title}
              </ThemedText>
            )}
            {liveStreamInfo.description && (
              <ThemedText style={styles.livePreviewDescription} numberOfLines={2}>
                {liveStreamInfo.description}
              </ThemedText>
            )}
            <ThemedText style={styles.livePreviewDomain}>{liveStreamInfo.domain}</ThemedText>
            <View style={styles.livePreviewActions}>
              <TouchableOpacity
                style={styles.livePreviewPrimaryButton}
                onPress={handleWatchLive}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t('common.watchNow')}
              >
                <ThemedText style={styles.livePreviewPrimaryButtonText}>{t('common.watchNow')}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.livePreviewSecondaryButton, { borderColor }]}
                onPress={handleProfilePress}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t('common.openProfile')}
              >
                <ThemedText style={styles.livePreviewSecondaryButtonText}>{t('common.openProfile')}</ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
      )
    : null;

  const handleLikePress = () => {
    if (!post.uri || !post.cid) return;

    if (!!post.viewer?.like) {
      // Unlike the post
      likeMutation.mutate({
        postUri: post.uri,
        likeUri: post.viewer.like,
        action: 'unlike',
      });
    } else {
      // Like the post
      likeMutation.mutate({
        postUri: post.uri,
        postCid: post.cid,
        action: 'like',
      });
    }
  };

  const handleReplyPress = () => {
    setShowReplyComposer(true);
  };

  const handleImageLoad = (imageUrl: string, width: number, height: number) => {
    setImageDimensions((prev) => ({
      ...prev,
      [imageUrl]: { width, height },
    }));
  };

  // Extract image URLs and alt text from embed data
  const getImageData = () => {
    // Check both embed and embeds fields
    const embedData = post.embed || (post.embeds && post.embeds[0]);
    if (!embedData) return { urls: [], altTexts: [] };

    // Handle different embed types
    if (embedData.$type === 'app.bsky.embed.images' || embedData.$type === 'app.bsky.embed.images#view') {
      // Filter out video files, only show actual images
      const imageFiles =
        embedData.images?.filter((img: BlueskyImage) => !img.image?.mimeType || !img.image.mimeType.startsWith('video/')) ||
        [];

      const urls = imageFiles.map((img: BlueskyImage) => img.fullsize).filter(Boolean) || [];
      const altTexts = imageFiles.map((img: BlueskyImage) => img.alt) || [];
      return { urls, altTexts };
    }

    // Handle record with media embeds (quoted post with media added by quoter)
    if (embedData.$type === 'app.bsky.embed.recordWithMedia#view' && embedData.media) {
      if (embedData.media.$type === 'app.bsky.embed.images#view' && embedData.media.images) {
        // Filter out video files, only show actual images
        const imageFiles = embedData.media.images.filter(
          (img: BlueskyImage) => !img.image?.mimeType || !img.image.mimeType.startsWith('video/'),
        );

        const urls = imageFiles.map((img: BlueskyImage) => img.fullsize).filter(Boolean);
        const altTexts = imageFiles.map((img: BlueskyImage) => img.alt);
        return { urls, altTexts };
      }
    }

    // Handle other embed types that might contain images
    if (embedData.images) {
      // Filter out video files, only show actual images
      const imageFiles = embedData.images.filter(
        (img: BlueskyImage) => !img.image?.mimeType || !img.image.mimeType.startsWith('video/'),
      );

      const urls = imageFiles.map((img: BlueskyImage) => img.fullsize).filter(Boolean);
      const altTexts = imageFiles.map((img: BlueskyImage) => img.alt);
      return { urls, altTexts };
    }

    return { urls: [], altTexts: [] };
  };

  // Extract video data from embed
  const getVideoData = () => {
    // Check main embed first
    if (post.embed) {
      // Handle Bluesky native video embeds (app.bsky.embed.video#view)
      if (post.embed.$type === 'app.bsky.embed.video#view' && post.embed.playlist) {
        return {
          videoUrl: post.embed.playlist,
          thumbnailUrl: post.embed.thumbnail,
          altText: post.embed.alt || t('common.video'),
          aspectRatio: post.embed.aspectRatio,
        };
      }

      // Handle legacy video embeds (app.bsky.embed.video)
      if (post.embed.video) {
        return {
          videoUrl: post.embed.video.ref.$link,
          thumbnailUrl: post.embed.video.ref.$link, // Use video URL as thumbnail for now
          altText: post.embed.video.alt || t('common.video'),
          aspectRatio: post.embed.aspectRatio,
        };
      }

      // Handle record with media embeds that might contain video
      if (post.embed.$type === 'app.bsky.embed.recordWithMedia#view' && post.embed.media) {
        if (post.embed.media.$type === 'app.bsky.embed.video#view' && post.embed.media.playlist) {
          return {
            videoUrl: post.embed.media.playlist,
            thumbnailUrl: post.embed.media.thumbnail,
            altText: post.embed.media.alt || t('common.video'),
            aspectRatio: post.embed.media.aspectRatio,
          };
        }
        if (post.embed.media.video) {
          return {
            videoUrl: post.embed.media.video.ref.$link,
            thumbnailUrl: post.embed.media.video.ref.$link,
            altText: post.embed.media.video.alt || t('common.video'),
            aspectRatio: post.embed.media.aspectRatio,
          };
        }
      }
    }

    // Check embeds array if main embed doesn't have video
    if (post.embeds && post.embeds.length > 0) {
      for (const embed of post.embeds) {
        // Handle Bluesky native video embeds (app.bsky.embed.video#view)
        if (embed.$type === 'app.bsky.embed.video#view' && embed.playlist) {
          return {
            videoUrl: embed.playlist,
            thumbnailUrl: embed.thumbnail,
            altText: embed.alt || t('common.video'),
            aspectRatio: embed.aspectRatio,
          };
        }

        if (embed.video) {
          return {
            videoUrl: embed.video.ref.$link,
            thumbnailUrl: embed.video.ref.$link,
            altText: embed.video.alt || t('common.video'),
            aspectRatio: embed.aspectRatio,
          };
        }

        // Handle record with media embeds in embeds array
        if (embed.$type === 'app.bsky.embed.recordWithMedia#view' && embed.media) {
          if (embed.media.$type === 'app.bsky.embed.video#view' && embed.media.playlist) {
            return {
              videoUrl: embed.media.playlist,
              thumbnailUrl: embed.media.thumbnail,
              altText: embed.media.alt || t('common.video'),
              aspectRatio: embed.media.aspectRatio,
            };
          }
          if (embed.media.video) {
            return {
              videoUrl: embed.media.video.ref.$link,
              thumbnailUrl: embed.media.video.ref.$link,
              altText: embed.media.video.alt || t('common.video'),
              aspectRatio: embed.media.aspectRatio,
            };
          }
        }
      }
    }

    return null;
  };

  const { urls: imageUrls, altTexts } = getImageData();
  const videoData = getVideoData();

  // Check if embed is a YouTube embed
  const isYouTubeEmbed = () => {
    // Check both embed and embeds fields
    const embedData = post.embed || (post.embeds && post.embeds[0]);

    if (!embedData) {
      return false;
    }

    // Handle both "app.bsky.embed.external" and "app.bsky.embed.external#view"
    if (!embedData.$type?.includes('app.bsky.embed.external')) {
      return false;
    }

    const uri = embedData.external?.uri || '';
    return uri.includes('youtube.com') || uri.includes('youtu.be') || uri.includes('music.youtube.com');
  };

  // Check if embed is an external embed (non-YouTube, non-GIF)
  const isExternalEmbed = () => {
    const embedData = post.embed || (post.embeds && post.embeds[0]);

    if (!embedData || !embedData.$type?.includes('app.bsky.embed.external')) {
      return false;
    }

    const uri = embedData.external?.uri || '';
    return (
      !uri.includes('youtube.com') &&
      !uri.includes('youtu.be') &&
      !uri.includes('music.youtube.com') &&
      !uri.includes('tenor.com') &&
      !uri.includes('media.tenor.com') &&
      !uri.endsWith('.gif')
    );
  };

  // Check if embed is a GIF embed
  const isGifEmbed = () => {
    const embedData = post.embed || (post.embeds && post.embeds[0]);

    if (!embedData || !embedData.$type?.includes('app.bsky.embed.external')) {
      return false;
    }

    const uri = embedData.external?.uri || '';
    return uri.includes('tenor.com') || uri.includes('media.tenor.com') || uri.endsWith('.gif');
  };

  // Check if embed is a native video embed
  const isNativeVideoEmbed = () => {
    const result = videoData !== null;
    return result;
  };

  // Check if embed is an external video embed
  const isExternalVideoEmbed = () => {
    const embedData = post.embed || (post.embeds && post.embeds[0]);

    if (!embedData) {
      return false;
    }

    // Check for external video embeds (non-YouTube)
    if (embedData.$type?.includes('app.bsky.embed.external')) {
      const uri = embedData.external?.uri || '';
      // Check if it's a video link but not YouTube
      const isVideoLink =
        uri.includes('vimeo.com') ||
        uri.includes('dailymotion.com') ||
        uri.includes('twitch.tv') ||
        uri.includes('tiktok.com') ||
        uri.includes('.mp4') ||
        uri.includes('.mov') ||
        uri.includes('.avi') ||
        uri.includes('.webm');

      return isVideoLink && !isYouTubeEmbed();
    }

    return false;
  };

  // Check if embed is a record embed (quoted post)
  const isRecordEmbed = () => {
    const embedData = post.embed || (post.embeds && post.embeds[0]);
    return embedData?.$type === 'app.bsky.embed.record#view' && embedData.record;
  };

  // Check if embed is a record with media embed (quoted post with media)
  const isRecordWithMediaEmbed = () => {
    const embedData = post.embed || (post.embeds && post.embeds[0]);
    return embedData?.$type === 'app.bsky.embed.recordWithMedia#view' && embedData.record;
  };

  // Get the embed data for rendering external embeds
  const getEmbedData = () => {
    const embedData = post.embed || (post.embeds && post.embeds[0]);
    if (!embedData || !embedData.$type?.includes('app.bsky.embed.external')) {
      return null;
    }
    return embedData as {
      $type: 'app.bsky.embed.external' | 'app.bsky.embed.external#view';
      external: {
        description: string;
        thumb?: {
          $type: 'blob';
          ref: {
            $link: string;
          };
          mimeType: string;
          size: number;
        };
        title: string;
        uri: string;
      };
    };
  };

  // Get the embed data for rendering video embeds
  const getVideoEmbedData = () => {
    const embedData = post.embed || (post.embeds && post.embeds[0]);
    if (!embedData) {
      return null;
    }
    return embedData as {
      $type?: string;
      external?: {
        description: string;
        thumb?: {
          $type: 'blob';
          ref: {
            $link: string;
          };
          mimeType: string;
          size: number;
        };
        title: string;
        uri: string;
      };
      media?: {
        $type: string;
        images?: BlueskyImage[];
        video?: {
          alt: string;
          ref: {
            $link: string;
          };
          mimeType: string;
          size: number;
          aspectRatio?: {
            width: number;
            height: number;
          };
        };
      };
      videoUrl?: string;
      thumbnailUrl?: string;
      altText?: string;
      aspectRatio?: {
        width: number;
        height: number;
      };
    };
  };

  // Get the embed data for rendering record embeds
  const getRecordEmbedData = () => {
    const embedData = post.embed || (post.embeds && post.embeds[0]);
    if (!embedData || !embedData.record) {
      return null;
    }
    return embedData as {
      $type: 'app.bsky.embed.record#view' | 'app.bsky.embed.recordWithMedia#view';
      record: {
        uri: string;
        cid: string;
        author: {
          did: string;
          handle: string;
          displayName: string;
          avatar: string;
        };
        record: Record<string, unknown>;
        embed?: BlueskyEmbed;
        replyCount: number;
        repostCount: number;
        likeCount: number;
        indexedAt: string;
        viewer?: {
          like?: string;
          repost?: string;
          reply?: string;
        };
      };
      media?: BlueskyEmbed;
    };
  };

  const handleImagePress = (index: number) => {
    setSelectedImageIndex(index);
  };

  const handleCloseImageViewer = () => {
    setSelectedImageIndex(null);
  };

  const postContent = (
    <>
      {/* Reply Context */}
      {post.replyTo && (
        <ThemedView style={styles.replyContext}>
          <IconSymbol name="arrowshape.turn.up.left" size={12} color={iconColor} style={styles.replyIcon} />
          <ThemedText style={styles.replyText}>Replying to @{post.replyTo.author.handle}</ThemedText>
          <ThemedText style={styles.replyPreview} numberOfLines={1}>
            {post.replyTo.text}
          </ThemedText>
        </ThemedView>
      )}

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
                  uri: post.author.avatar || 'https://bsky.app/static/default-avatar.png',
                }}
                style={styles.authorAvatar}
                contentFit="cover"
                placeholder={require('@/assets/images/partial-react-logo.png')}
              />
              {isLive && (
                <View style={styles.liveBadge}>
                  <ThemedText style={styles.liveBadgeText}>{t('common.live')}</ThemedText>
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
              <ThemedText style={styles.handle}>@{post.author.handle}</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
        <View style={styles.headerMeta}>
          <ThemedText style={styles.timestamp}>{post.createdAt}</ThemedText>
          <TouchableOpacity
            ref={menuButtonRef}
            onPress={handleMenuToggle}
            style={styles.menuButton}
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityLabel={`${t('common.actions')} - ${authorName}`}
          >
            <IconSymbol name="ellipsis" size={18} color={iconColor} />
          </TouchableOpacity>
        </View>
      </ThemedView>

      <ThemedView style={styles.content}>
        <RichTextWithFacets text={post.text || ''} facets={post.facets} style={styles.text} />

        {isSummaryVisible && (
          <ThemedView
            style={[
              styles.summaryContainer,
              { backgroundColor: summaryBackgroundColor, borderColor: summaryBorderColor },
            ]}
          >
            <View style={styles.summaryHeader}>
              <ThemedText style={styles.summaryTitle}>{t('post.summary.title')}</ThemedText>
              <TouchableOpacity
                onPress={handleHideSummary}
                accessibilityRole="button"
                accessibilityLabel={t('common.hide')}
                activeOpacity={0.6}
              >
                <ThemedText style={[styles.summaryHide, { color: iconColor }]}>
                  {t('common.hide')}
                </ThemedText>
              </TouchableOpacity>
            </View>
            <View style={styles.summaryContent}>
              {isSummarizing ? (
                <View style={styles.summaryLoading}>
                  <ActivityIndicator size="small" color={iconColor} />
                  <ThemedText style={[styles.summaryLoadingLabel, { color: summaryTextColor }]}>
                    {t('post.summary.generating')}
                  </ThemedText>
                </View>
              ) : summaryError ? (
                <View style={styles.summaryErrorContainer}>
                  <ThemedText style={[styles.summaryError, { color: summaryErrorColor }]}>
                    {summaryError}
                  </ThemedText>
                  <TouchableOpacity
                    onPress={handleRetrySummary}
                    accessibilityRole="button"
                    accessibilityLabel={t('post.summary.retry')}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={[styles.summaryRetry, { color: iconColor }]}>
                      {t('post.summary.retry')}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              ) : summaryText ? (
                <ThemedText style={[styles.summaryText, { color: summaryTextColor }]}>
                  {summaryText}
                </ThemedText>
              ) : null}
            </View>
          </ThemedView>
        )}

        {isTranslationVisible && (
          <ThemedView
            style={[styles.translationContainer, { backgroundColor: translationBackgroundColor, borderColor }]}
          >
            <View style={styles.translationHeader}>
              <ThemedText style={styles.translationTitle}>{t('post.translation.title')}</ThemedText>
              <TouchableOpacity
                onPress={handleHideTranslation}
                accessibilityRole="button"
                accessibilityLabel={t('post.translation.hide')}
                activeOpacity={0.6}
              >
                <ThemedText style={[styles.translationHide, { color: iconColor }]}>
                  {t('post.translation.hide')}
                </ThemedText>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.translationLanguageSelector, { borderColor: dividerColor }]}
              onPress={() => setIsLanguagePickerVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={t('post.translation.selectLanguage')}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.translationLabel}>{t('post.translation.to')}</ThemedText>
              <ThemedText style={styles.translationLanguageValue}>{selectedLanguageName}</ThemedText>
            </TouchableOpacity>
            <ThemedView style={styles.translationContent}>
              {isTranslating ? (
                <ActivityIndicator size="small" color={iconColor} />
              ) : translationError ? (
                <ThemedText style={styles.translationError}>{translationError}</ThemedText>
              ) : (
                <ThemedText style={styles.translationText}>{translationCache[selectedLanguage]}</ThemedText>
              )}
            </ThemedView>
          </ThemedView>
        )}

        {/* Render native video embed if present */}
        {(() => {
          const isNative = isNativeVideoEmbed();
          return isNative && videoData && <VideoEmbed embed={videoData} onClose={() => setSelectedImageIndex(null)} />;
        })()}

        {/* Render external video embed if present */}
        {(() => {
          const isExternalVideo = isExternalVideoEmbed();
          const videoEmbedData = getVideoEmbedData();
          return isExternalVideo && videoEmbedData && <VideoEmbed embed={videoEmbedData} />;
        })()}

        {/* Render YouTube embed if present */}
        {(() => {
          const isYouTube = isYouTubeEmbed();
          const embedData = getEmbedData();
          return isYouTube && embedData && <YouTubeEmbed embed={embedData} />;
        })()}

        {/* Render GIF embed if present */}
        {(() => {
          const isGif = isGifEmbed();
          const embedData = getEmbedData();
          return isGif && embedData && <GifEmbed embed={embedData} />;
        })()}

        {/* Render external embed if present (non-YouTube, non-GIF) */}
        {(() => {
          const isExternal = isExternalEmbed();
          const embedData = getEmbedData();
          return isExternal && embedData && <ExternalEmbed embed={embedData} />;
        })()}

        {/* Render images if present (should come before record embed for recordWithMedia) */}
        {imageUrls.length > 0 && (
          <ThemedView style={styles.imagesContainer}>
            {imageUrls.map((imageUrl: string, index: number) => {
              const dimensions = imageDimensions[imageUrl];
              const screenWidth = 400; // Approximate screen width minus padding
              const imageHeight = dimensions ? (dimensions.height / dimensions.width) * screenWidth : 300;

              return (
                <TouchableOpacity
                  key={`${post.id}-image-${index}`}
                  onPress={() => handleImagePress(index)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: imageUrl }}
                    style={[styles.image, { height: imageHeight }]}
                    contentFit="contain"
                    placeholder={require('@/assets/images/partial-react-logo.png')}
                    onLoad={(event) => handleImageLoad(imageUrl, event.source.width, event.source.height)}
                  />
                </TouchableOpacity>
              );
            })}
          </ThemedView>
        )}

        {/* Render record embed (quoted post) if present */}
        {(() => {
          const isRecord = isRecordEmbed();
          const isRecordWithMedia = isRecordWithMediaEmbed();
          const recordData = getRecordEmbedData();
          return (isRecord || isRecordWithMedia) && recordData && <RecordEmbed embed={recordData} />;
        })()}
      </ThemedView>

      {/* Labels */}
      <Labels labels={post.labels} maxLabels={3} />

      <ThemedView style={styles.interactions}>
        <TouchableOpacity
          style={styles.interactionItem}
          onPress={handleReplyPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Reply to post by ${authorName}`}
        >
          <IconSymbol name="bubble.left" size={16} color={iconColor} style={styles.interactionIcon} />
          <ThemedText style={styles.interactionCount}>{post.commentCount || 0}</ThemedText>
        </TouchableOpacity>
        <ThemedView style={styles.interactionItem}>
          <IconSymbol name="arrow.2.squarepath" size={16} color={iconColor} style={styles.interactionIcon} />
          <ThemedText style={styles.interactionCount}>{post.repostCount || 0}</ThemedText>
        </ThemedView>
        <TouchableOpacity
          style={styles.interactionItem}
          onPress={handleLikePress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={
            post.viewer?.like
              ? `Unlike post by ${authorName}`
              : `Like post by ${authorName}`
          }
        >
          <IconSymbol
            name={post.viewer?.like ? 'heart.fill' : 'heart'}
            size={16}
            color={post.viewer?.like ? '#ff3b30' : iconColor}
            style={styles.interactionIcon}
          />
          <ThemedText style={styles.interactionCount}>{post.likeCount || 0}</ThemedText>
        </TouchableOpacity>
      </ThemedView>
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
          {livePreview}
          {postContent}
        </TouchableOpacity>
      ) : (
        <ThemedView style={[styles.container, { borderBottomColor: borderColor }]}>
          {livePreview}
          {postContent}
        </ThemedView>
      )}

      <Modal transparent animationType="fade" visible={showActionsMenu} onRequestClose={handleMenuDismiss}>
        {showActionsMenu && (
          <TouchableWithoutFeedback onPress={handleMenuDismiss}>
            <View style={styles.menuOverlay}>
              <TouchableWithoutFeedback>
                <ThemedView
                  style={[styles.menuContainer, menuStyle, { backgroundColor: menuBackgroundColor, borderColor }]}
                  accessibilityRole="menu"
                >
                  {menuActions.map((item) => {
                    if ('type' in item) {
                      return <View key={item.key} style={[styles.menuSeparator, { borderColor: dividerColor }]} />;
                    }

                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={styles.menuItem}
                        onPress={item.disabled ? undefined : item.onPress}
                        disabled={item.disabled}
                        accessibilityRole="menuitem"
                        accessibilityState={{ disabled: item.disabled }}
                        activeOpacity={item.disabled ? 1 : 0.7}
                      >
                        <ThemedText
                          style={[
                            styles.menuItemText,
                            item.destructive && styles.menuItemTextDestructive,
                            item.disabled && styles.menuItemTextDisabled,
                          ]}
                        >
                          {item.label}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </ThemedView>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        )}
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={isLanguagePickerVisible}
        onRequestClose={() => setIsLanguagePickerVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsLanguagePickerVisible(false)}>
          <View style={styles.menuOverlay}>
            <TouchableWithoutFeedback>
              <ThemedView
                style={[styles.languageModal, { backgroundColor: modalBackgroundColor, borderColor }]}
                accessibilityRole="menu"
              >
                <ThemedText style={styles.languageModalTitle}>{t('post.translation.selectLanguage')}</ThemedText>
                {languagesQuery.isLoading ? (
                  <View style={styles.languageModalIndicator}>
                    <ActivityIndicator size="small" color={iconColor} />
                  </View>
                ) : (
                  <ScrollView style={styles.languageList}>
                    {languages.map((language) => {
                      const isSelected = language.code === selectedLanguage;
                      return (
                        <TouchableOpacity
                          key={language.code}
                          style={[
                            styles.languageOption,
                            { borderColor: dividerColor },
                            isSelected && styles.languageOptionSelected,
                          ]}
                          onPress={() => handleLanguageSelect(language.code)}
                          accessibilityRole="menuitem"
                          accessibilityState={{ selected: isSelected }}
                          activeOpacity={0.7}
                        >
                          <ThemedText
                            style={[
                              styles.languageOptionText,
                              isSelected && styles.languageOptionSelectedText,
                            ]}
                          >
                            {language.name}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </ThemedView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Image Viewer Modal */}
      {selectedImageIndex !== null && imageUrls[selectedImageIndex] && (
        <ImageViewer
          visible={selectedImageIndex !== null}
          onClose={handleCloseImageViewer}
          imageUrl={imageUrls[selectedImageIndex]}
          altText={altTexts[selectedImageIndex]}
        />
      )}

      {/* Reply Composer Modal */}
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
}

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
  replyAuthor: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
  },
  replyPreview: {
    fontSize: 11,
    opacity: 0.5,
    fontStyle: 'italic',
    flex: 1,
    marginLeft: 8,
  },
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
  content: {
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  summaryContainer: {
    borderWidth: 1,
    marginTop: 12,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryHide: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryContent: {
    gap: 12,
  },
  summaryLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryLoadingLabel: {
    fontSize: 15,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
  },
  summaryErrorContainer: {
    gap: 8,
  },
  summaryError: {
    fontSize: 15,
    lineHeight: 22,
  },
  summaryRetry: {
    fontSize: 15,
    fontWeight: '600',
  },
  translationContainer: {
    borderWidth: 1,
    marginTop: 12,
    marginBottom: 12,
    padding: 12,
  },
  translationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  translationTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  translationHide: {
    fontSize: 13,
    fontWeight: '500',
  },
  translationLanguageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  translationLabel: {
    fontSize: 13,
    opacity: 0.7,
  },
  translationLanguageValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  translationContent: {
    marginTop: 8,
  },
  translationText: {
    fontSize: 15,
    lineHeight: 22,
  },
  translationError: {
    fontSize: 13,
    lineHeight: 20,
    color: '#d13232',
  },
  imagesContainer: {
    gap: 4,
  },
  image: {
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent', // Will be overridden by theme color
  },
  videoContainer: {
    marginTop: 8,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlaceholder: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  interactions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  interactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  interactionIcon: {
    // IconSymbol handles its own sizing
  },
  interactionCount: {
    fontSize: 14,
    opacity: 0.7,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  menuContainer: {
    position: 'absolute',
    borderWidth: 1,
    minWidth: 220,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemText: {
    fontSize: 14,
  },
  menuItemTextDestructive: {
    color: '#d13232',
  },
  menuItemTextDisabled: {
    opacity: 0.5,
  },
  menuSeparator: {
    borderTopWidth: 1,
    marginVertical: 4,
  },
  languageModal: {
    alignSelf: 'center',
    marginTop: 120,
    borderWidth: 1,
    width: '80%',
    maxHeight: '70%',
    padding: 16,
  },
  languageModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  languageList: {
    maxHeight: 300,
  },
  languageOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  languageOptionSelected: {
    borderColor: '#0a84ff',
  },
  languageOptionText: {
    fontSize: 14,
  },
  languageOptionSelectedText: {
    fontWeight: '600',
  },
  languageModalIndicator: {
    paddingVertical: 24,
    alignItems: 'center',
  },
});
