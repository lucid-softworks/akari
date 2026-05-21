import { Image } from '@/components/Image';
import React, { useCallback } from 'react';
import { FlatList, type ListRenderItem, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { activeOpacity, fontSize, fontWeight, layout, radius, spacing } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import type { ComposerDraftState } from '@/utils/draftMapper';
import { formatRelativeTime } from '@/utils/timeUtils';

type DraftsSheetProps = {
  visible: boolean;
  drafts: ComposerDraftState[];
  onDismiss: () => void;
  onSelect: (draft: ComposerDraftState) => void;
  onDelete: (draft: ComposerDraftState) => void;
};

const draftKeyExtractor = (draft: ComposerDraftState) => draft.id;

export function DraftsSheet({ visible, drafts, onDismiss, onSelect, onDelete }: DraftsSheetProps) {
  const { t, locale } = useTranslation();
  const { bottom } = useSafeAreaInsets();

  const sheetBg = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'text');
  const textColor = useThemeColor({}, 'text');

  const renderDraft = useCallback<ListRenderItem<ComposerDraftState>>(
    ({ item: draft, index: idx }) => {
      const firstPost = draft.posts[0];
      const preview = firstPost?.text.trim() ?? '';
      const previewLine = preview.length > 0 ? preview : t('post.draft.untitled');
      const totalImages = draft.posts.reduce(
        (sum, p) => sum + p.images.length,
        0,
      );
      const firstImage = draft.posts.find((p) => p.images.length > 0)?.images[0];
      return (
        <View>
          {idx > 0 ? <View style={[styles.divider, { backgroundColor: borderColor }]} /> : null}
          <Pressable
            style={({ pressed }) => [styles.row, pressed && { opacity: activeOpacity.default }]}
            onPress={() => onSelect(draft)}
          >
            <View style={styles.rowMain}>
              <ThemedText
                style={[styles.rowText, { color: textColor }]}
                numberOfLines={2}
              >
                {previewLine}
              </ThemedText>
              <View style={styles.rowMeta}>
                <ThemedText style={[styles.metaText, { color: iconColor }]}>
                  {formatRelativeTime(draft.updatedAt, locale)}
                </ThemedText>
                {draft.posts.length > 1 ? (
                  <View style={styles.metaImages}>
                    <IconSymbol name="text.bubble" size={12} color={iconColor} />
                    <ThemedText style={[styles.metaText, { color: iconColor }]}>
                      {draft.posts.length}
                    </ThemedText>
                  </View>
                ) : null}
                {totalImages > 0 ? (
                  <View style={styles.metaImages}>
                    <IconSymbol name="photo" size={12} color={iconColor} />
                    <ThemedText style={[styles.metaText, { color: iconColor }]}>
                      {totalImages}
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            </View>
            {firstImage?.uri ? (
              <Image
                source={{ uri: firstImage.uri }}
                style={[styles.thumb, { borderColor }]}
                contentFit="cover"
              />
            ) : null}
            <Pressable
              onPress={() => onDelete(draft)}
              hitSlop={10}
              style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.7 }]}
              accessibilityLabel={t('post.draft.delete')}
            >
              <IconSymbol name="trash" size={18} color={iconColor} />
            </Pressable>
          </Pressable>
        </View>
      );
    },
    [t, locale, textColor, iconColor, borderColor, onSelect, onDelete],
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable
          style={[styles.sheetWrapper, { paddingBottom: bottom + spacing.md }]}
          onPress={(e) => e.stopPropagation()}
        >
          <ThemedView style={[styles.sheet, { backgroundColor: sheetBg, borderColor }]}>
            <View style={[styles.header, { borderBottomColor: borderColor }]}>
              <View style={styles.headerSide} />
              <ThemedText style={[styles.headerTitle, { color: textColor }]}>
                {t('post.draft.title')}
              </ThemedText>
              <View style={styles.headerSide}>
                <Pressable onPress={onDismiss} hitSlop={12} style={({ pressed }) => pressed && { opacity: 0.7 }}>
                  <ThemedText style={[styles.headerAction, { color: iconColor }]}>
                    {t('common.cancel')}
                  </ThemedText>
                </Pressable>
              </View>
            </View>

            {drafts.length === 0 ? (
              <View style={styles.emptyState}>
                <ThemedText style={[styles.emptyText, { color: iconColor }]}>
                  {t('post.draft.empty')}
                </ThemedText>
              </View>
            ) : (
              <FlatList
                style={styles.scroll}
                data={drafts}
                keyExtractor={draftKeyExtractor}
                renderItem={renderDraft}
              />
            )}
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetWrapper: { paddingHorizontal: spacing.lg },
  sheet: {
    borderRadius: radius.lg,
    borderWidth: layout.hairline,
    overflow: 'hidden',
    ...Platform.select({
      web: { maxWidth: 480, alignSelf: 'center', width: '100%' },
      default: {},
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
  },
  headerSide: { minWidth: 60, alignItems: 'flex-end' },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, flex: 1, textAlign: 'center' },
  headerAction: { fontSize: fontSize.lg },
  emptyState: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xxl, alignItems: 'center' },
  emptyText: { fontSize: fontSize.base },
  scroll: { maxHeight: 480 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowMain: { flex: 1, gap: spacing.xs },
  rowText: { fontSize: fontSize.base, fontWeight: fontWeight.medium },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaText: { fontSize: fontSize.sm },
  metaImages: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: layout.hairline,
  },
  deleteButton: { padding: spacing.xs },
  divider: { height: layout.hairline, marginLeft: spacing.lg },
});
