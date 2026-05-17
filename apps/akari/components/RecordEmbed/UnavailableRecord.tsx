import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { fontSize, fontWeight, layout, radius } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

import type { UnavailableKind } from '@/components/RecordEmbed/recordEmbedUtils';

export type UnavailableRecordProps = {
  kind: UnavailableKind | 'unknown';
  handleLabel: string | null;
  blockingMessage: string | null;
};

/**
 * Minimal placeholder shown when a quoted record is blocked, deleted, or
 * detached — or when we couldn't resolve any author info at all.
 */
export function UnavailableRecord({ kind, handleLabel, blockingMessage }: UnavailableRecordProps) {
  const { t } = useTranslation();
  const textColor = useThemeColor({ light: '#000000', dark: '#ffffff' }, 'text');
  const secondaryTextColor = useThemeColor({ light: '#666666', dark: '#999999' }, 'text');
  const borderColor = useThemeColor({ light: '#e8eaed', dark: '#2d3133' }, 'background');

  const placeholderMessage =
    kind === 'blocked'
      ? blockingMessage ?? t('post.blockedPost')
      : kind === 'notFound'
      ? t('post.deletedPost')
      : kind === 'detached'
      ? t('post.detachedPost')
      : t('post.unavailablePost');
  const iconName: 'hand.raised.fill' | 'eye.slash' | 'link.badge.plus' =
    kind === 'blocked'
      ? 'hand.raised.fill'
      : kind === 'notFound'
      ? 'eye.slash'
      : kind === 'detached'
      ? 'link.badge.plus'
      : 'eye.slash';

  return (
    <View
      style={[
        styles.container,
        styles.blockedPlaceholder,
        { borderColor, backgroundColor: 'transparent' },
      ]}
    >
      <IconSymbol name={iconName} size={18} color={secondaryTextColor} />
      <View style={styles.blockedPlaceholderText}>
        <ThemedText style={[styles.blockedPlaceholderTitle, { color: textColor }]} numberOfLines={1}>
          {placeholderMessage}
        </ThemedText>
        {handleLabel ? (
          <ThemedText
            style={[styles.blockedPlaceholderHandle, { color: secondaryTextColor }]}
            numberOfLines={1}
          >
            {handleLabel}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: layout.border,
    borderRadius: radius.sm,
    marginTop: 6,
    overflow: 'hidden',
  },
  blockedPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  blockedPlaceholderText: {
    flex: 1,
  },
  blockedPlaceholderTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  blockedPlaceholderHandle: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
});
