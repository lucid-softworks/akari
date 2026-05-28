import React, { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { fontSize, hexToRgba } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';
import { describePostControls, type PostControls } from '@/utils/postControls';
import type { ComposeMode } from '@/utils/postComposer/types';
import { MAX_POST_CHARACTERS } from '@/utils/postComposer/types';

import { styles } from './styles';

type FooterIconButtonProps = {
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  /** Color the icon paints at rest and the hover wash is derived from. */
  activeColor: string;
  /** Fallback colour used when the button is disabled. */
  mutedColor: string;
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
};

const FooterIconButton = React.memo(function FooterIconButton({
  icon,
  activeColor,
  mutedColor,
  disabled,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: FooterIconButtonProps) {
  const [hovered, setHovered] = useState(false);
  const showHover = Platform.OS === 'web' && hovered && !disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPointerEnter={Platform.OS === 'web' && !disabled ? () => setHovered(true) : undefined}
      onPointerLeave={Platform.OS === 'web' ? () => setHovered(false) : undefined}
      style={({ pressed }) => [
        styles.actionButton,
        disabled && styles.actionButtonDisabled,
        showHover && { backgroundColor: hexToRgba(activeColor, 0.1) },
        pressed && !disabled && { opacity: 0.7 },
      ]}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      <IconSymbol name={icon} size={20} color={disabled ? mutedColor : activeColor} />
    </Pressable>
  );
});

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
  pollActive: boolean;
  pollDisabled: boolean;
  borderColor: string;
  iconColor: string;
  tintColor: string;
  onAddPhoto: () => void;
  onAddVideo: () => void;
  onTogglePoll: () => void;
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
  pollActive,
  pollDisabled,
  borderColor,
  iconColor,
  tintColor,
  onAddPhoto,
  onAddVideo,
  onTogglePoll,
  onOpenEmoji,
  onAddGif,
  onOpenControls,
  onOpenLanguages,
}: ComposerFooterProps) {
  const { t } = useTranslation();

  return (
    <View style={[styles.footer, { borderTopColor: borderColor }]}>
      <View style={styles.footerLeft}>
        <FooterIconButton
          icon="photo"
          activeColor={tintColor}
          mutedColor={iconColor}
          disabled={photoDisabled}
          onPress={onAddPhoto}
          accessibilityLabel={t('post.addPhoto')}
          accessibilityHint={t('post.selectPhoto')}
        />
        <FooterIconButton
          icon="video"
          activeColor={tintColor}
          mutedColor={iconColor}
          disabled={videoDisabled}
          onPress={onAddVideo}
          accessibilityLabel={t('post.addVideo')}
        />
        <FooterIconButton
          icon="chart.bar.fill"
          activeColor={pollActive ? tintColor : iconColor}
          mutedColor={iconColor}
          disabled={pollDisabled}
          onPress={onTogglePoll}
          accessibilityLabel={t('poll.newPoll')}
        />
        <FooterIconButton
          icon="face.smiling"
          activeColor={tintColor}
          mutedColor={iconColor}
          onPress={onOpenEmoji}
          accessibilityLabel={t('post.addEmoji')}
        />
        <FooterIconButton
          icon="gif"
          activeColor={tintColor}
          mutedColor={iconColor}
          disabled={gifDisabled}
          onPress={onAddGif}
          accessibilityLabel={t('gif.addGif')}
          accessibilityHint={t('gif.selectGif')}
        />
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
