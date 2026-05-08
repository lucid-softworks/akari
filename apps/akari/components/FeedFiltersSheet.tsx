import React, { useCallback } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { activeOpacity, fontSize, fontWeight, layout, radius, spacing } from '@/constants/tokens';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useFeedFilters, type FeedFilters } from '@/hooks/useFeedFilters';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

const ACCENT = '#0085ff';

type FeedFiltersSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Feed key to scope filter persistence (e.g. `'following'` or a feed URI). */
  feedKey: string | null | undefined;
};

type CountKey = 'Likes' | 'Reposts' | 'Replies' | 'Bookmarks';

const COUNT_KEYS: readonly CountKey[] = ['Likes', 'Reposts', 'Replies', 'Bookmarks'];

function getMin(filters: FeedFilters, key: CountKey): number | undefined {
  return filters[`min${key}` as keyof FeedFilters] as number | undefined;
}

function getMax(filters: FeedFilters, key: CountKey): number | undefined {
  return filters[`max${key}` as keyof FeedFilters] as number | undefined;
}

function parseBound(input: string): number | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isNaN(parsed) || parsed < 0) return undefined;
  return parsed;
}

export function FeedFiltersSheet({ visible, onClose, feedKey }: FeedFiltersSheetProps) {
  const { t } = useTranslation();
  const borderColor = useBorderColor();
  const backgroundColor = useThemeColor({ light: '#ffffff', dark: '#151718' }, 'background');
  const textColor = useThemeColor({ light: '#000000', dark: '#ffffff' }, 'text');
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const inputBackground = useThemeColor({ light: '#f3f4f6', dark: '#1f2326' }, 'background');

  const { filters, update, reset } = useFeedFilters(feedKey);

  // Android fullScreen Modal needs explicit top safe area; iOS pageSheet
  // already insets correctly. Same trick used in VerifiersSheet.
  const containerTopPadding = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;

  const renderToggleRow = useCallback(
    (key: keyof FeedFilters, label: string) => {
      const value = filters[key] as boolean;
      return (
        <View key={String(key)} style={[styles.row, { borderBottomColor: borderColor }]}>
          <ThemedText style={[styles.rowLabel, { color: textColor }]}>{label}</ThemedText>
          <Switch
            value={value}
            onValueChange={(next) => update({ [key]: next } as Partial<FeedFilters>)}
            trackColor={{ true: ACCENT, false: borderColor }}
          />
        </View>
      );
    },
    [borderColor, filters, textColor, update],
  );

  const renderCountRow = useCallback(
    (key: CountKey, label: string) => {
      const min = getMin(filters, key);
      const max = getMax(filters, key);
      const minPatch: Partial<FeedFilters> = {
        [`min${key}`]: undefined,
      };
      const maxPatch: Partial<FeedFilters> = {
        [`max${key}`]: undefined,
      };
      return (
        <View key={key} style={[styles.row, { borderBottomColor: borderColor }]}>
          <ThemedText style={[styles.rowLabel, { color: textColor }]}>{label}</ThemedText>
          <View style={styles.rangeInputs}>
            <TextInput
              style={[styles.rangeInput, { backgroundColor: inputBackground, color: textColor }]}
              value={min !== undefined ? String(min) : ''}
              onChangeText={(value) =>
                update({ ...minPatch, [`min${key}`]: parseBound(value) } as Partial<FeedFilters>)
              }
              placeholder={t('feed.filterMin')}
              placeholderTextColor={subduedColor}
              keyboardType="number-pad"
              accessibilityLabel={t('feed.filterMinLabel', { metric: label })}
            />
            <ThemedText style={[styles.rangeSeparator, { color: subduedColor }]}>–</ThemedText>
            <TextInput
              style={[styles.rangeInput, { backgroundColor: inputBackground, color: textColor }]}
              value={max !== undefined ? String(max) : ''}
              onChangeText={(value) =>
                update({ ...maxPatch, [`max${key}`]: parseBound(value) } as Partial<FeedFilters>)
              }
              placeholder={t('feed.filterMax')}
              placeholderTextColor={subduedColor}
              keyboardType="number-pad"
              accessibilityLabel={t('feed.filterMaxLabel', { metric: label })}
            />
          </View>
        </View>
      );
    },
    [borderColor, filters, inputBackground, subduedColor, t, textColor, update],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <ThemedView style={[styles.container, { backgroundColor, paddingTop: containerTopPadding }]}>
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <TouchableOpacity onPress={reset} style={styles.headerButton} accessibilityRole="button">
            <ThemedText style={[styles.headerButtonText, { color: subduedColor }]}>
              {t('common.reset')}
            </ThemedText>
          </TouchableOpacity>
          <ThemedText style={[styles.headerTitle, { color: textColor }]}>
            {t('feed.filterSheetTitle')}
          </ThemedText>
          <TouchableOpacity onPress={onClose} style={styles.headerButton} accessibilityRole="button">
            <ThemedText style={[styles.headerButtonText, { color: ACCENT, fontWeight: fontWeight.semibold }]}>
              {t('common.done')}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <SectionHeader label={t('feed.filterSectionHide')} subduedColor={subduedColor} />
          {renderToggleRow('hideReplies', t('feed.hideReplies'))}
          {renderToggleRow('hideReposts', t('feed.hideReposts'))}
          {renderToggleRow('hideQuotes', t('feed.hideQuotes'))}
          {renderToggleRow('hideEngaged', t('feed.hideEngaged'))}

          <SectionHeader label={t('feed.filterSectionAuthor')} subduedColor={subduedColor} />
          {renderToggleRow('onlyFollowing', t('feed.onlyFollowing'))}
          {renderToggleRow('onlyMutuals', t('feed.onlyMutuals'))}

          <SectionHeader label={t('feed.filterSectionCounts')} subduedColor={subduedColor} />
          {COUNT_KEYS.map((key) =>
            renderCountRow(key, t(`feed.count${key}`)),
          )}
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

function SectionHeader({ label, subduedColor }: { label: string; subduedColor: string }) {
  return (
    <View style={styles.sectionHeader}>
      <ThemedText style={[styles.sectionHeaderText, { color: subduedColor }]}>
        {label.toUpperCase()}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: layout.hairline,
  },
  headerButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minWidth: 64,
  },
  headerButtonText: {
    fontSize: fontSize.md,
  },
  headerTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  sectionHeaderText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: layout.hairline,
    minHeight: 52,
    gap: spacing.md,
  },
  rowLabel: {
    fontSize: fontSize.base,
    flexShrink: 1,
  },
  rangeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rangeInput: {
    width: 72,
    height: 36,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  rangeSeparator: {
    fontSize: fontSize.base,
  },
});
