import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { BlueskySavedFeedItem } from '@/bluesky-api';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { SettingsScroll } from '@/components/settings/SettingsScroll';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import {
  activeOpacity,
  fontSize,
  fontWeight,
  layout,
  semanticColors,
  spacing,
} from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useUpdateSavedFeeds } from '@/hooks/mutations/useUpdateSavedFeeds';
import { useSavedFeeds } from '@/hooks/queries/usePreferences';
import { useSavedFeedsList } from '@/hooks/useSavedFeedsList';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

export default function ManageSavedFeedsScreen() {
  const borderColor = useBorderColor();
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({}, 'tint');
  const { t } = useTranslation();
  const { showToast } = useToast();

  const { allFeedsWithCreated, savedFeedsLoading } = useSavedFeedsList();
  const update = useUpdateSavedFeeds();

  // The saved-feeds list itself is what we mutate. Resolve names from
  // `allFeedsWithCreated` (which has display metadata) but key off the
  // raw entries in the preference.
  const namedFeeds = useMemo(() => {
    const byUri = new Map(
      allFeedsWithCreated.map((feed) => [feed.uri, feed.displayName]),
    );
    return (item: BlueskySavedFeedItem) => byUri.get(item.value) ?? item.value;
  }, [allFeedsWithCreated]);

  const togglePinned = (item: BlueskySavedFeedItem) => {
    update.mutate(
      (current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, pinned: !entry.pinned } : entry,
        ),
      {
        onError: () => showToast({ type: 'error', message: t('common.somethingWentWrong') }),
      },
    );
  };

  const remove = (item: BlueskySavedFeedItem) => {
    update.mutate(
      (current) => current.filter((entry) => entry.id !== item.id),
      {
        onError: () => showToast({ type: 'error', message: t('common.somethingWentWrong') }),
      },
    );
  };

  const move = (item: BlueskySavedFeedItem, direction: -1 | 1) => {
    update.mutate(
      (current) => {
        const idx = current.findIndex((entry) => entry.id === item.id);
        if (idx === -1) return current;
        const swap = idx + direction;
        if (swap < 0 || swap >= current.length) return current;
        const next = current.slice();
        [next[idx], next[swap]] = [next[swap], next[idx]];
        return next;
      },
      {
        onError: () => showToast({ type: 'error', message: t('common.somethingWentWrong') }),
      },
    );
  };

  // `useSavedFeedsList` doesn't expose the raw preference items so we
  // pull them straight from useSavedFeeds via a second hook call. The
  // ordering matters: drag-up / drag-down operate on the raw list.
  const rawItems = useRawSavedFeedItems();

  return (
    <SettingsSubpageLayout title={t('settings.manageSavedFeeds')}>
      <SettingsScroll
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <ThemedText style={[styles.intro, { color: subduedColor }]}>
          {t('settings.manageSavedFeedsIntro')}
        </ThemedText>

        {savedFeedsLoading ? (
          <ThemedText style={[styles.empty, { color: subduedColor }]}>{t('common.loading')}</ThemedText>
        ) : rawItems.length === 0 ? (
          <ThemedText style={[styles.empty, { color: subduedColor }]}>
            {t('settings.manageSavedFeedsEmpty')}
          </ThemedText>
        ) : (
          <ThemedView style={[styles.card, { borderColor }]}>
            {rawItems.map((item, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === rawItems.length - 1;
              return (
                <View
                  key={item.id}
                  style={[
                    styles.row,
                    !isLast && { borderBottomColor: borderColor, borderBottomWidth: layout.hairline },
                  ]}
                >
                  <View style={styles.rowBody}>
                    <ThemedText style={[styles.feedName, { color: textColor }]} numberOfLines={1}>
                      {namedFeeds(item)}
                    </ThemedText>
                    {item.pinned ? (
                      <ThemedText style={[styles.pinnedBadge, { color: accentColor }]}>
                        {t('settings.manageSavedFeedsPinned')}
                      </ThemedText>
                    ) : null}
                  </View>
                  <View style={styles.actions}>
                    <IconButton icon="chevron.up" onPress={() => move(item, -1)} disabled={isFirst} color={textColor} />
                    <IconButton icon="chevron.down" onPress={() => move(item, 1)} disabled={isLast} color={textColor} />
                    <IconButton
                      icon={item.pinned ? 'pin.slash' : 'pin'}
                      onPress={() => togglePinned(item)}
                      color={accentColor}
                    />
                    <IconButton
                      icon="trash"
                      onPress={() => remove(item)}
                      color={semanticColors.danger}
                    />
                  </View>
                </View>
              );
            })}
          </ThemedView>
        )}
      </SettingsScroll>
    </SettingsSubpageLayout>
  );
}

function IconButton({
  icon,
  onPress,
  disabled,
  color,
}: {
  icon: Parameters<typeof IconSymbol>[0]['name'];
  onPress: () => void;
  disabled?: boolean;
  color: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconButton,
        pressed && !disabled && { opacity: activeOpacity.default },
        disabled && styles.disabled,
      ]}
      accessibilityRole="button"
    >
      <IconSymbol name={icon} size={18} color={color} />
    </Pressable>
  );
}

// Returns the raw saved-feeds preference items in their stored order
// so the reorder / pin / remove controls operate on the canonical list
// rather than the metadata-enriched `useSavedFeedsList` view.
function useRawSavedFeedItems(): BlueskySavedFeedItem[] {
  const { data } = useSavedFeeds();
  return useMemo<BlueskySavedFeedItem[]>(
    () =>
      (data ?? []).map((entry, idx) => ({
        id: entry.id ?? `${entry.type}:${entry.value}:${idx}`,
        type: entry.type,
        value: entry.value,
        pinned: entry.pinned,
      })),
    [data],
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  contentContainer: { paddingBottom: spacing.xxl },
  intro: {
    marginHorizontal: spacing.lg,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  empty: {
    textAlign: 'center',
    fontSize: fontSize.sm,
  },
  card: {
    marginHorizontal: spacing.lg,
    borderWidth: layout.hairline,
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  feedName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  pinnedBadge: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.3,
  },
});
