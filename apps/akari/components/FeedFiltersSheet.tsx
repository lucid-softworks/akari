import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { fontSize, fontWeight, layout, radius, spacing } from '@/constants/tokens';
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <ThemedView style={[styles.container, { backgroundColor, paddingTop: containerTopPadding }]}>
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <Pressable onPress={reset} style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.7 }]} accessibilityRole="button">
            <ThemedText style={[styles.headerButtonText, { color: subduedColor }]}>
              {t('common.reset')}
            </ThemedText>
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: textColor }]}>
            {t('feed.filterSheetTitle')}
          </ThemedText>
          <Pressable onPress={onClose} style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.7 }]} accessibilityRole="button">
            <ThemedText style={[styles.headerButtonText, { color: ACCENT, fontWeight: fontWeight.semibold }]}>
              {t('common.done')}
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <SectionHeader label={t('feed.filterSectionHide')} subduedColor={subduedColor} />
          <ToggleRow filterKey="hideReplies" label={t('feed.hideReplies')} filters={filters} update={update} borderColor={borderColor} textColor={textColor} />
          <ToggleRow filterKey="hideReposts" label={t('feed.hideReposts')} filters={filters} update={update} borderColor={borderColor} textColor={textColor} />
          <ToggleRow filterKey="hideQuotes" label={t('feed.hideQuotes')} filters={filters} update={update} borderColor={borderColor} textColor={textColor} />
          <ToggleRow filterKey="hideEngaged" label={t('feed.hideEngaged')} filters={filters} update={update} borderColor={borderColor} textColor={textColor} />

          <SectionHeader label={t('feed.filterSectionAuthor')} subduedColor={subduedColor} />
          <ToggleRow filterKey="onlyFollowing" label={t('feed.onlyFollowing')} filters={filters} update={update} borderColor={borderColor} textColor={textColor} />
          <ToggleRow filterKey="onlyMutuals" label={t('feed.onlyMutuals')} filters={filters} update={update} borderColor={borderColor} textColor={textColor} />

          <SectionHeader label={t('feed.filterSectionCounts')} subduedColor={subduedColor} />
          {/* oxlint-disable-next-line react-doctor/rn-no-scrollview-mapped-list -- Bounded 4-element list (COUNT_KEYS), virtualization overhead > scan cost */}
          {COUNT_KEYS.map((key) => (
            <CountRow
              key={key}
              countKey={key}
              label={t(`feed.count${key}`)}
              filters={filters}
              update={update}
              borderColor={borderColor}
              textColor={textColor}
              subduedColor={subduedColor}
              inputBackground={inputBackground}
            />
          ))}
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

type ToggleRowProps = {
  filterKey: keyof FeedFilters;
  label: string;
  filters: FeedFilters;
  update: (patch: Partial<FeedFilters>) => void;
  borderColor: string;
  textColor: string;
};

function ToggleRow({ filterKey, label, filters, update, borderColor, textColor }: ToggleRowProps) {
  const value = filters[filterKey] as boolean;
  return (
    <View style={[styles.row, { borderBottomColor: borderColor }]}>
      <ThemedText style={[styles.rowLabel, { color: textColor }]}>{label}</ThemedText>
      <Switch
        value={value}
        onValueChange={(next) => update({ [filterKey]: next } as Partial<FeedFilters>)}
        trackColor={{ true: ACCENT, false: borderColor }}
      />
    </View>
  );
}

type CountRowProps = {
  countKey: CountKey;
  label: string;
  filters: FeedFilters;
  update: (patch: Partial<FeedFilters>) => void;
  borderColor: string;
  textColor: string;
  subduedColor: string;
  inputBackground: string;
};

function CountRow({
  countKey,
  label,
  filters,
  update,
  borderColor,
  textColor,
  subduedColor,
  inputBackground,
}: CountRowProps) {
  const { t } = useTranslation();
  const min = getMin(filters, countKey);
  const max = getMax(filters, countKey);
  const minPatch: Partial<FeedFilters> = {
    [`min${countKey}`]: undefined,
  };
  const maxPatch: Partial<FeedFilters> = {
    [`max${countKey}`]: undefined,
  };
  return (
    <View style={[styles.row, { borderBottomColor: borderColor }]}>
      <ThemedText style={[styles.rowLabel, { color: textColor }]}>{label}</ThemedText>
      <View style={styles.rangeInputs}>
        <TextInput
          style={[styles.rangeInput, { backgroundColor: inputBackground, color: textColor }]}
          value={min !== undefined ? String(min) : ''}
          onChangeText={(value) =>
            update({ ...minPatch, [`min${countKey}`]: parseBound(value) } as Partial<FeedFilters>)
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
            update({ ...maxPatch, [`max${countKey}`]: parseBound(value) } as Partial<FeedFilters>)
          }
          placeholder={t('feed.filterMax')}
          placeholderTextColor={subduedColor}
          keyboardType="number-pad"
          accessibilityLabel={t('feed.filterMaxLabel', { metric: label })}
        />
      </View>
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
