import { Image } from '@/components/Image';
import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { PostInlineCard } from '@/components/PostInlineCard';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { fontSize, fontWeight, radius, spacing } from '@/constants/tokens';
import { useFeedSettings } from '@/hooks/useFeedSettings';
import { useTranslation } from '@/hooks/useTranslation';
import { matchYouTubeId, youtubeThumbnailUrl } from '@/utils/embedThumb';
import { useNavigateToPost } from '@/utils/navigation';

const TENOR_RX = /(https?:\/\/(?:media\.)?tenor\.com\/\S+)/i;

export type ChatMedia =
  | { kind: 'gif'; url: string; matchedText: string }
  | { kind: 'youtube'; videoId: string; matchedText: string }
  | { kind: 'bskyPost'; handle: string; rkey: string; matchedText: string };

const YT_URL_RX =
  /(https?:\/\/(?:www\.|music\.|m\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)[^\s]+)/i;
const BSKY_POST_RX =
  /(https?:\/\/(?:www\.)?bsky\.app\/profile\/([^/\s]+)\/post\/([^/\s?#]+))/i;

/**
 * Scans a chat message's text for the first inline-media URL we know how
 * to render. Returns `null` for plain text.
 *
 * Also returns the exact matched substring so the caller can strip it
 * from the displayed bubble — once the media renders inline below, leaving
 * the bare URL in the text is just noise.
 *
 * Chat embeds at the lexicon level are limited to `app.bsky.embed.record`
 * (post shares); detecting Tenor and YouTube URLs in plain text is a
 * client-side enhancement so other clients still see the URL as text.
 */
export function extractChatMedia(text: string): ChatMedia | null {
  const ytMatch = text.match(YT_URL_RX);
  if (ytMatch) {
    const id = matchYouTubeId(ytMatch[1]);
    if (id) return { kind: 'youtube', videoId: id, matchedText: ytMatch[1] };
  }
  const tenorMatch = text.match(TENOR_RX);
  if (tenorMatch) {
    return { kind: 'gif', url: tenorMatch[1], matchedText: tenorMatch[1] };
  }
  const bskyMatch = text.match(BSKY_POST_RX);
  if (bskyMatch) {
    return {
      kind: 'bskyPost',
      handle: bskyMatch[2],
      rkey: bskyMatch[3],
      matchedText: bskyMatch[1],
    };
  }
  return null;
}

/**
 * Removes the matched media URL from the text and trims surrounding
 * whitespace so the bubble doesn't show a now-redundant link.
 */
export function stripChatMediaText(text: string, matchedText: string): string {
  return text.replace(matchedText, '').replace(/\s{2,}/g, ' ').trim();
}

type ChatMediaEmbedProps = {
  media: ChatMedia;
  /** Side of the message column the bubble is on, so we can match width. */
  alignment: 'left' | 'right';
};

export function ChatMediaEmbed({ media, alignment }: ChatMediaEmbedProps) {
  const { videoAutoplayEnabled } = useFeedSettings();
  if (media.kind === 'gif') {
    return (
      <View
        style={[
          styles.container,
          alignment === 'right' ? styles.alignRight : styles.alignLeft,
        ]}
      >
        <Image
          source={{ uri: media.url }}
          style={styles.gif}
          contentFit="cover"
          autoplay={videoAutoplayEnabled}
        />
      </View>
    );
  }

  if (media.kind === 'bskyPost') {
    return (
      <BlueskyPostChatEmbed
        handle={media.handle}
        rkey={media.rkey}
        alignment={alignment}
      />
    );
  }

  return (
    <YouTubeChatEmbed videoId={media.videoId} alignment={alignment} />
  );
}

type BlueskyPostChatEmbedProps = {
  handle: string;
  rkey: string;
  alignment: 'left' | 'right';
};

function BlueskyPostChatEmbed({ handle, rkey, alignment }: BlueskyPostChatEmbedProps) {
  const navigateToPost = useNavigateToPost();
  return (
    <PostInlineCard
      handle={handle}
      rkey={rkey}
      onPress={() => navigateToPost({ actor: handle, rKey: rkey })}
      style={[
        styles.bskyCard,
        alignment === 'right' ? styles.alignRight : styles.alignLeft,
      ]}
    />
  );
}

type YouTubeChatEmbedProps = {
  videoId: string;
  alignment: 'left' | 'right';
};

function YouTubeChatEmbed({ videoId, alignment }: YouTubeChatEmbedProps) {
  const { t } = useTranslation();
  const [errored, setErrored] = useState(false);
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Use the IFrame Player API rather than a bare embed URL so we can catch
  // per-video restrictions (errors 100/101/150/152 — e.g. embedding
  // disabled by the uploader) and fall back to a tap-to-open-in-YouTube
  // thumbnail. baseUrl is set to youtube.com so the player gets a valid
  // origin context (otherwise YouTube returns error 153).
  const ytHtml = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" /><style>html,body{margin:0;padding:0;height:100%;background:#000;overflow:hidden}#player{width:100%;height:100%}</style></head><body><div id="player"></div><script>var tag=document.createElement('script');tag.src='https://www.youtube.com/iframe_api';var first=document.getElementsByTagName('script')[0];first.parentNode.insertBefore(tag,first);function onYouTubeIframeAPIReady(){new YT.Player('player',{videoId:'${videoId}',playerVars:{modestbranding:1,playsinline:1,rel:0},events:{onError:function(e){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'error',code:e.data}));}}});}</script></body></html>`;

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type === 'error') {
        setErrored(true);
      }
    } catch {
      // Malformed message — ignore.
    }
  };

  if (errored) {
    return (
      <Pressable
        style={({ pressed }) => [styles.container,
          styles.youtube,
          alignment === 'right' ? styles.alignRight : styles.alignLeft, pressed && { opacity: 0.85 }]}
        onPress={() => Linking.openURL(watchUrl)}
        
      >
        <Image
          source={{ uri: youtubeThumbnailUrl(videoId) }}
          style={styles.youtubeThumb}
          contentFit="cover"
        />
        <View style={styles.youtubePlayOverlay}>
          <View style={styles.youtubePlayButton}>
            <IconSymbol name="play.fill" size={20} color="#ffffff" />
          </View>
          <ThemedText style={styles.youtubeFallbackText} lightColor="#ffffff" darkColor="#ffffff">
            {t('chat.openInYouTube')}
          </ThemedText>
        </View>
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.container,
        styles.youtube,
        alignment === 'right' ? styles.alignRight : styles.alignLeft,
      ]}
    >
      {Platform.OS === 'web' ? (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?modestbranding=1&playsinline=1&rel=0`}
          style={{ width: '100%', height: '100%', border: 0 }}
          allow="accelerometer; encrypted-media; picture-in-picture; web-share"
          allowFullScreen
          title="YouTube video player"
          sandbox="allow-scripts allow-presentation allow-popups"
        />
      ) : (
        <WebView
          originWhitelist={['*']}
          source={{ html: ytHtml, baseUrl: 'https://www.youtube.com' }}
          style={styles.webview}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          androidLayerType="hardware"
          onMessage={handleMessage}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 240,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  alignLeft: {
    alignSelf: 'flex-start',
  },
  alignRight: {
    alignSelf: 'flex-end',
  },
  gif: {
    width: '100%',
    aspectRatio: 1,
  },
  youtube: {
    aspectRatio: 16 / 9,
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  youtubeThumb: {
    width: '100%',
    height: '100%',
  },
  youtubePlayOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  youtubePlayButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  youtubeFallbackText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  bskyCard: {
    width: 240,
  },
});
