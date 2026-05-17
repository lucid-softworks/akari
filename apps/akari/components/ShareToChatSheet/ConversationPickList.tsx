import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View, type ListRenderItem } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { activeOpacity, fontSize, fontWeight, layout, radius, spacing } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

import { ConversationListRow } from './ConversationListRow';
import type { ConversationRow } from './types';

type ConversationPickListProps = {
  conversations: ConversationRow[];
  isLoading: boolean;
  selectedIds: Set<string>;
  selectedCount: number;
  onToggle: (convo: ConversationRow) => void;
  onNext: () => void;
};

const keyExtractor = (item: ConversationRow) => item.convoId;

/**
 * Step 1 of the share sheet: loading state, empty state, or virtualized
 * conversation list with a sticky "Next" CTA when at least one
 * recipient is selected.
 */
export function ConversationPickList({
  conversations,
  isLoading,
  selectedIds,
  selectedCount,
  onToggle,
  onNext,
}: ConversationPickListProps) {
  const { t } = useTranslation();
  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'text');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  const itemSeparator = useCallback(
    () => <View style={[styles.divider, { backgroundColor: borderColor }]} />,
    [borderColor],
  );

  const renderRow = useCallback<ListRenderItem<ConversationRow>>(
    ({ item }) => (
      <ConversationListRow
        item={item}
        checked={selectedIds.has(item.convoId)}
        onToggle={onToggle}
        borderColor={borderColor}
        textColor={textColor}
        iconColor={iconColor}
        tintColor={tintColor}
      />
    ),
    [borderColor, iconColor, selectedIds, textColor, tintColor, onToggle],
  );

  if (isLoading && conversations.length === 0) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator color={iconColor} />
      </View>
    );
  }

  if (conversations.length === 0) {
    return (
      <View style={styles.emptyState}>
        <ThemedText style={[styles.emptyText, { color: iconColor }]}>
          {t('common.noConversations')}
        </ThemedText>
      </View>
    );
  }

  return (
    <>
      <FlatList
        style={styles.list}
        data={conversations}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={itemSeparator}
        renderItem={renderRow}
      />
      {selectedCount > 0 ? (
        <View style={[styles.nextBar, { borderTopColor: borderColor }]}>
          <Pressable
            style={({ pressed }) => [
              styles.nextButton,
              { backgroundColor: tintColor },
              pressed && { opacity: activeOpacity.default },
            ]}
            onPress={onNext}
          >
            <ThemedText style={styles.nextButtonText}>
              {t('post.share.nextWithCount', { count: selectedCount })}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: 380 },
  loadingState: { paddingVertical: spacing.xxl, alignItems: 'center' },
  emptyState: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xxl, alignItems: 'center' },
  emptyText: { fontSize: fontSize.base },
  divider: { height: layout.hairline, marginLeft: spacing.lg + 36 + spacing.md },
  nextBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: layout.hairline,
  },
  nextButton: {
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
    alignItems: 'center',
  },
  nextButtonText: { color: '#000000', fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
});
