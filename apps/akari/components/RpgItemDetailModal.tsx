import { Image } from '@/components/Image';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { buildRpgItemBlobUrl, pickRpgItemImageCid, type RpgItemRecord } from '@/bluesky-api';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Dialog } from '@/components/ui/Dialog';
import { activeOpacity, fontSize, fontWeight, layout, radius, spacing } from '@/constants/tokens';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type RpgItemDetailModalProps = {
  item: RpgItemRecord;
  pdsUrl: string | undefined;
  onClose: () => void;
};

/**
 * Detail view for one rpg.actor inventory item. Mounted by
 * dialogManager from RpgItemsTab. Shows the icon/asset blob, title,
 * kind badge, description, and provenance (provider DID + acceptedAt).
 */
export function RpgItemDetailModal({ item, pdsUrl, onClose }: RpgItemDetailModalProps) {
  const { t } = useTranslation();
  const borderColor = useBorderColor();
  const secondary = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const badgeBg = useThemeColor({ light: '#EEF2FF', dark: '#1F2937' }, 'background');
  const badgeText = useThemeColor({ light: '#4338CA', dark: '#A5B4FC' }, 'text');

  const itemDid = item.uri.split('/')[2];
  const cid = pickRpgItemImageCid(item);
  const imageUrl = pdsUrl && itemDid && cid ? buildRpgItemBlobUrl(pdsUrl, itemDid, cid) : null;

  const kindLabel = item.value.kind ?? 'layer';
  const acceptedAt = new Date(item.value.acceptedAt);
  const acceptedAtLabel = Number.isNaN(acceptedAt.getTime())
    ? item.value.acceptedAt
    : acceptedAt.toLocaleDateString();

  return (
    <Dialog keyboardAvoiding onClose={onClose} maxWidth={520}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={[styles.heroBox, { borderColor }]}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.heroImage} contentFit="contain" />
          ) : (
            <ThemedText style={[styles.heroPlaceholder, { color: secondary }]}>
              {t('common.unknown')}
            </ThemedText>
          )}
        </View>

        <View style={styles.titleRow}>
          <ThemedText style={styles.title}>{item.value.title}</ThemedText>
          <View style={[styles.kindBadge, { backgroundColor: badgeBg }]}>
            <ThemedText style={[styles.kindBadgeText, { color: badgeText }]}>
              {kindLabel}
            </ThemedText>
          </View>
        </View>

        {item.value.description ? (
          <ThemedText style={[styles.description, { color: secondary }]}>
            {item.value.description}
          </ThemedText>
        ) : null}

        <ThemedView style={[styles.metaRow, { borderTopColor: borderColor }]}>
          <View style={styles.metaItem}>
            <ThemedText style={[styles.metaLabel, { color: secondary }]}>
              {t('profile.rpgItemsProvider')}
            </ThemedText>
            <ThemedText style={styles.metaValue} numberOfLines={1} selectable>
              {item.value.provider}
            </ThemedText>
          </View>
          <View style={styles.metaItem}>
            <ThemedText style={[styles.metaLabel, { color: secondary }]}>
              {t('profile.rpgItemsAcceptedAt')}
            </ThemedText>
            <ThemedText style={styles.metaValue}>{acceptedAtLabel}</ThemedText>
          </View>
        </ThemedView>

        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.closeButton,
            { borderColor },
            pressed && { opacity: activeOpacity.subtle },
          ]}
          accessibilityRole="button"
        >
          <ThemedText style={styles.closeButtonLabel}>{t('common.ok')}</ThemedText>
        </Pressable>
      </ScrollView>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  heroBox: {
    borderRadius: radius.md,
    borderWidth: layout.hairline,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    fontSize: fontSize.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    flexShrink: 1,
  },
  kindBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
  },
  kindBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'capitalize',
  },
  description: {
    fontSize: fontSize.base,
    lineHeight: 22,
  },
  metaRow: {
    borderTopWidth: layout.hairline,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  metaItem: {
    gap: spacing.xxs,
  },
  metaLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: fontSize.sm,
  },
  closeButton: {
    paddingVertical: spacing.sm,
    borderWidth: layout.hairline,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  closeButtonLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
});
