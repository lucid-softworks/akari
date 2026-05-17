import type { BlueskyEmbed } from '@/bluesky-api';
import { ExternalEmbed } from '@/components/ExternalEmbed';
import { GifEmbed } from '@/components/GifEmbed';
import { RecordEmbed } from '@/components/RecordEmbed';
import { VideoEmbed } from '@/components/VideoEmbed';
import { YouTubeEmbed } from '@/components/YouTubeEmbed';

export type RecordEmbedData = Parameters<typeof RecordEmbed>[0]['embed'];
export type ExternalEmbedData = Parameters<typeof ExternalEmbed>[0]['embed'];
export type GifEmbedData = Parameters<typeof GifEmbed>[0]['embed'];
export type YouTubeEmbedData = Parameters<typeof YouTubeEmbed>[0]['embed'];
export type VideoEmbedData = Parameters<typeof VideoEmbed>[0]['embed'];

export type MessageImageData = {
  url: string;
  alt: string;
};

export const isYouTubeUrl = (uri: string | undefined): boolean => {
  if (!uri) return false;
  const normalized = uri.toLowerCase();
  return (
    normalized.includes('youtube.com/watch') ||
    normalized.includes('youtu.be/') ||
    normalized.includes('music.youtube.com/watch') ||
    normalized.includes('youtube.com/embed/')
  );
};

export const isGifUrl = (uri: string | undefined): boolean => {
  if (!uri) return false;
  const normalized = uri.toLowerCase();
  return (
    normalized.includes('tenor.com') ||
    normalized.includes('media.tenor.com') ||
    normalized.endsWith('.gif')
  );
};

export const isVideoUrl = (uri: string | undefined): boolean => {
  if (!uri) return false;
  const normalized = uri.toLowerCase();
  const videoDomains = ['vimeo.com', 'dailymotion.com', 'twitch.tv', 'tiktok.com'];
  for (const domain of videoDomains) {
    if (normalized.includes(domain)) return true;
  }
  const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.m3u8'];
  for (const extension of videoExtensions) {
    if (normalized.includes(extension)) return true;
  }
  return false;
};

export const getRecordEmbedData = (embed: BlueskyEmbed | undefined): RecordEmbedData | null => {
  if (!embed) return null;
  if (embed.$type === 'app.bsky.embed.record#view' && embed.record) {
    return embed as RecordEmbedData;
  }
  if (embed.$type === 'app.bsky.embed.recordWithMedia#view' && embed.record) {
    return embed as RecordEmbedData;
  }
  return null;
};

export const getVideoEmbedData = (embed: BlueskyEmbed | undefined): VideoEmbedData | null => {
  if (!embed) return null;

  if (embed.$type === 'app.bsky.embed.video#view' && embed.playlist) {
    return {
      videoUrl: embed.playlist,
      thumbnailUrl: embed.thumbnail,
      altText: embed.alt,
      aspectRatio: embed.aspectRatio,
    } as VideoEmbedData;
  }

  if (embed.video?.ref?.$link) {
    return {
      videoUrl: embed.video.ref.$link,
      thumbnailUrl: embed.video.ref.$link,
      altText: embed.video.alt,
      aspectRatio: embed.aspectRatio,
    } as VideoEmbedData;
  }

  if (embed.media?.$type === 'app.bsky.embed.video#view' && embed.media.playlist) {
    return {
      videoUrl: embed.media.playlist,
      thumbnailUrl: embed.media.thumbnail,
      altText: embed.media.alt,
      aspectRatio: embed.media.aspectRatio,
    } as VideoEmbedData;
  }

  if (embed.media?.video?.ref?.$link) {
    return {
      videoUrl: embed.media.video.ref.$link,
      thumbnailUrl: embed.media.video.ref.$link,
      altText: embed.media.video.alt,
      aspectRatio: embed.media.aspectRatio,
    } as VideoEmbedData;
  }

  if (embed.$type?.includes('app.bsky.embed.external') && embed.external) {
    const uri = embed.external.uri;
    if (!isYouTubeUrl(uri) && !isGifUrl(uri) && isVideoUrl(uri)) {
      return embed as VideoEmbedData;
    }
  }

  return null;
};

export const getYouTubeEmbedData = (embed: BlueskyEmbed | undefined): YouTubeEmbedData | null => {
  if (!embed?.external || !embed.$type?.includes('app.bsky.embed.external')) return null;
  return isYouTubeUrl(embed.external.uri) ? (embed as YouTubeEmbedData) : null;
};

export const getGifEmbedData = (embed: BlueskyEmbed | undefined): GifEmbedData | null => {
  if (!embed?.external || !embed.$type?.includes('app.bsky.embed.external')) return null;
  return isGifUrl(embed.external.uri) ? (embed as GifEmbedData) : null;
};

export const getExternalEmbedData = (embed: BlueskyEmbed | undefined): ExternalEmbedData | null => {
  if (!embed?.external || !embed.$type?.includes('app.bsky.embed.external')) return null;
  const uri = embed.external.uri;
  if (isYouTubeUrl(uri) || isGifUrl(uri) || isVideoUrl(uri)) return null;
  return embed as ExternalEmbedData;
};

export const getImageEmbedData = (embed: BlueskyEmbed | undefined): MessageImageData[] => {
  if (!embed) return [];
  const images: MessageImageData[] = [];

  const collectImages = (imageList: BlueskyEmbed['images'] | undefined) => {
    if (!imageList) return;
    for (const image of imageList) {
      if (image.image?.mimeType && image.image.mimeType.startsWith('video/')) continue;
      const url = image.fullsize || image.thumb;
      if (url) images.push({ url, alt: image.alt });
    }
  };

  collectImages(embed.images);
  if (embed.media?.images) {
    collectImages(embed.media.images);
  }
  return images;
};
