import { Pressable, View } from 'react-native';

import { Input } from '@/components/ui/Input';

import { ThemedText } from '@/components/ThemedText';
import { VideoThumbnail } from '@/components/VideoThumbnail';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTranslation } from '@/hooks/useTranslation';
import type { AttachedVideo } from '@/utils/postComposer/types';

import { styles } from './styles';

type VideoAttachmentItemProps = {
  video: AttachedVideo;
  onRemove: () => void;
  onUpdateAlt: (alt: string) => void;
  removeTestId?: string;
  textColor: string;
  iconColor: string;
  borderColor: string;
  backgroundColor: string;
  tintColor: string;
};

export function VideoAttachmentItem({
  video,
  onRemove,
  onUpdateAlt,
  removeTestId,
  textColor,
  iconColor,
  borderColor,
  backgroundColor,
  tintColor,
}: VideoAttachmentItemProps) {
  const { t } = useTranslation();

  const statusText = (() => {
    if (video.upload) {
      switch (video.upload.phase) {
        case 'authorizing':
          return t('post.video.preparing');
        case 'uploading':
          return t('post.video.uploading', {
            percent: Math.round(video.upload.progress * 100),
          });
        case 'processing':
          return video.upload.progress !== undefined
            ? t('post.video.processing', {
                percent: Math.round(video.upload.progress * 100),
              })
            : t('post.video.processingIndeterminate');
        case 'error':
          return video.upload.message;
        default:
          return null;
      }
    }
    if (video.blob) return t('post.video.ready');
    return null;
  })();

  const progressPercent =
    video.upload?.phase === 'uploading'
      ? Math.round(video.upload.progress * 100)
      : video.upload?.phase === 'processing'
      ? Math.round((video.upload.progress ?? 0) * 100)
      : null;

  return (
    <View style={styles.imagesContainer}>
      <View style={styles.imageItem}>
        <View style={[styles.imageContainer, styles.videoPreview, { borderColor }]}>
          <VideoThumbnail uri={video.uri} style={styles.videoThumbnail} />
          <View style={styles.videoPreviewBody}>
            <ThemedText
              style={[styles.videoPreviewText, { color: textColor }]}
              numberOfLines={1}
            >
              {video.uri.split('/').pop() ?? t('common.video')}
            </ThemedText>
            {statusText ? (
              <ThemedText
                style={[styles.videoStatusText, { color: iconColor }]}
                numberOfLines={1}
              >
                {statusText}
              </ThemedText>
            ) : null}
            {progressPercent !== null ? (
              <View style={[styles.progressTrack, { backgroundColor: borderColor }]}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: tintColor },
                    { width: `${progressPercent}%` },
                  ]}
                />
              </View>
            ) : null}
          </View>
          <Pressable
            style={({ pressed }) => [styles.removeImageButton, pressed && { opacity: 0.7 }]}
            onPress={onRemove}
            testID={removeTestId}
          >
            <IconSymbol name="xmark" size={16} color="#ffffff" />
          </Pressable>
        </View>
        <Input
          containerStyle={styles.altTextInput}
          value={video.alt}
          onChangeText={onUpdateAlt}
          placeholder={t('post.imageAltTextPlaceholder')}
          placeholderTextColor={iconColor}
          maxLength={1000}
        />
      </View>
    </View>
  );
}
