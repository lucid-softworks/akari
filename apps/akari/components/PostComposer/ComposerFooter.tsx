import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { fontSize } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';
import { describePostControls, type PostControls } from '@/utils/postControls';
import type { ComposeMode } from '@/utils/postComposer/types';
import { MAX_POST_CHARACTERS } from '@/utils/postComposer/types';

import { styles } from './styles';

type ComposerFooterProps = {
  composeMode: ComposeMode;
  characterCount: number;
  isNearLimit: boolean;
  isOverLimit: boolean;
  autoThreadPartCount: number;
  showControlsButton: boolean;
  postControls: PostControls;
  postLangs: string[];
  postLangsLabel: string;
  photoDisabled: boolean;
  videoDisabled: boolean;
  gifDisabled: boolean;
  borderColor: string;
  iconColor: string;
  tintColor: string;
  onAddPhoto: () => void;
  onAddVideo: () => void;
  onOpenEmoji: () => void;
  onAddGif: () => void;
  onOpenControls: () => void;
  onOpenLanguages: () => void;
};

export function ComposerFooter({
  composeMode,
  characterCount,
  isNearLimit,
  isOverLimit,
  autoThreadPartCount,
  showControlsButton,
  postControls,
  postLangs,
  postLangsLabel,
  photoDisabled,
  videoDisabled,
  gifDisabled,
  borderColor,
  iconColor,
  tintColor,
  onAddPhoto,
  onAddVideo,
  onOpenEmoji,
  onAddGif,
  onOpenControls,
  onOpenLanguages,
}: ComposerFooterProps) {
  const { t } = useTranslation();

  return (
    <View style={[styles.footer, { borderTopColor: borderColor }]}>
      <View style={styles.footerLeft}>
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            photoDisabled && styles.actionButtonDisabled,
            pressed && { opacity: 0.7 },
          ]}
          onPress={onAddPhoto}
          disabled={photoDisabled}
          accessibilityLabel={t('post.addPhoto')}
          accessibilityHint={t('post.selectPhoto')}
        >
          <IconSymbol name="photo" size={20} color={photoDisabled ? iconColor : tintColor} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            videoDisabled && styles.actionButtonDisabled,
            pressed && { opacity: 0.7 },
          ]}
          onPress={onAddVideo}
          disabled={videoDisabled}
          accessibilityLabel={t('post.addVideo')}
        >
          <IconSymbol name="video" size={20} color={videoDisabled ? iconColor : tintColor} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.7 }]}
          onPress={onOpenEmoji}
          accessibilityLabel={t('post.addEmoji')}
        >
          <IconSymbol name="face.smiling" size={20} color={tintColor} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            gifDisabled && styles.actionButtonDisabled,
            pressed && { opacity: 0.7 },
          ]}
          onPress={onAddGif}
          disabled={gifDisabled}
          accessibilityLabel={t('gif.addGif')}
          accessibilityHint={t('gif.selectGif')}
        >
          <IconSymbol name="gif" size={20} color={gifDisabled ? iconColor : tintColor} />
        </Pressable>
      </View>

      <View style={styles.footerCenter} pointerEvents="box-none">
        {showControlsButton ? (
          <Pressable
            style={({ pressed }) => [styles.controlsButton, pressed && { opacity: 0.7 }]}
            onPress={onOpenControls}
            accessibilityLabel={t('post.controls.title')}
          >
            <IconSymbol name="bubble.left.and.bubble.right" size={16} color={tintColor} />
            <ThemedText
              style={[styles.controlsButtonText, { color: tintColor }]}
              numberOfLines={1}
            >
              {describePostControls(postControls, t as (key: string) => string)}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.footerRight}>
        <Pressable
          style={({ pressed }) => [styles.langChip, { borderColor: iconColor }, pressed && { opacity: 0.7 }]}
          onPress={onOpenLanguages}
          accessibilityRole="button"
          accessibilityLabel={t('composer.postLanguageA11y', { value: postLangsLabel })}
        >
          <IconSymbol name="globe" size={fontSize.sm} color={iconColor} />
          <ThemedText style={[styles.langChipText, { color: iconColor }]} numberOfLines={1}>
            {postLangs.length === 1 ? postLangs[0].toUpperCase() : `${postLangs.length}`}
          </ThemedText>
        </Pressable>
        <View style={styles.characterCountContainer}>
          <ThemedText
            style={[
              styles.characterCount,
              { color: isOverLimit ? '#FF3B30' : isNearLimit ? '#FF9500' : iconColor },
            ]}
          >
            {characterCount}
          </ThemedText>
          {composeMode === 'standard' ? (
            <ThemedText style={[styles.characterCount, { color: iconColor }]}>
              /{MAX_POST_CHARACTERS}
            </ThemedText>
          ) : composeMode === 'autothread' ? (
            <ThemedText style={[styles.characterCount, { color: iconColor }]}>
              {` · ${
                autoThreadPartCount <= 1
                  ? t('post.autothread.singlePart')
                  : t('post.autothread.parts', { count: autoThreadPartCount })
              }`}
            </ThemedText>
          ) : null}
        </View>
      </View>
    </View>
  );
}
