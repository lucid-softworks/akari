import React, { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { activeOpacity, fontSize, fontWeight, layout, radius, semanticColors, spacing } from '@/constants/tokens';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { buildLanguageOptions } from '@/utils/bcp47';

const MAX_LANGS = 3;

type PostLanguagesSheetProps = {
  visible: boolean;
  onClose: () => void;
  selected: string[];
  onChange: (langs: string[]) => void;
};

/**
 * BCP-47 language picker shown from the post composer's footer chip. Lets
 * the user pick up to {@link MAX_LANGS} languages — the post record's
 * `langs` array on `app.bsky.feed.post` accepts multiple tags for
 * code-switched posts. The selection persists via `usePostLanguages`.
 */
export function PostLanguagesSheet({ visible, onClose, selected, onChange }: PostLanguagesSheetProps) {
  const { t } = useTranslation();
  const { currentLocale } = useLanguage();
  const borderColor = useBorderColor();
  const backgroundColor = useThemeColor({ light: '#ffffff', dark: '#151718' }, 'background');
  const textColor = useThemeColor({ light: '#000000', dark: '#ffffff' }, 'text');
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const selectedRowBg = useThemeColor({ light: '#eff6ff', dark: 'rgba(94, 177, 255, 0.12)' }, 'background');
  const inputBackground = useThemeColor({ light: '#f3f4f6', dark: '#1f2326' }, 'background');

  const [filter, setFilter] = useState('');

  const options = useMemo(
    () => buildLanguageOptions(currentLocale, selected),
    [currentLocale, selected],
  );
  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(needle) ||
      option.tag.toLowerCase().includes(needle) ||
      (option.nativeLabel?.toLowerCase().includes(needle) ?? false),
    );
  }, [filter, options]);

  // iOS pageSheet auto-respects the safe area; Android fullScreen draws
  // under the status bar so we push the header down by `StatusBar.currentHeight`
  // ourselves. (`useSafeAreaInsets` returns 0 inside a Modal — its native
  // window doesn't inherit the SafeAreaProvider context.)
  const containerTopPadding = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;

  const toggle = (tag: string) => {
    if (selected.includes(tag)) {
      // Don't let the user clear the entire list — at least one language
      // must stay selected so the post doesn't fall back to the network
      // default of `en`.
      if (selected.length === 1) return;
      onChange(selected.filter((s) => s !== tag));
      return;
    }
    if (selected.length >= MAX_LANGS) return;
    onChange([...selected, tag]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <ThemedView style={[styles.container, { backgroundColor, paddingTop: containerTopPadding }]}>
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <Pressable onPress={onClose} style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.7 }]} accessibilityRole="button" hitSlop={8}>
            <IconSymbol name="chevron.left" size={20} color={semanticColors.systemBlue} />
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: textColor }]}>
            {t('composer.postLanguageTitle')}
          </ThemedText>
          <View style={styles.headerButton} />
        </View>

        <ThemedText style={[styles.subhead, { color: subduedColor }]}>
          {t('composer.postLanguageHint', { max: MAX_LANGS })}
        </ThemedText>

        <View style={[styles.searchWrap, { backgroundColor: inputBackground }]}>
          <IconSymbol name="magnifyingglass" size={fontSize.base} color={subduedColor} />
          <TextInput
            style={[styles.searchInput, { color: textColor }]}
            value={filter}
            onChangeText={setFilter}
            placeholder={t('composer.postLanguageSearch')}
            placeholderTextColor={subduedColor}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
          {filtered.map((option) => {
            const isSelected = selected.includes(option.tag);
            return (
              <Pressable
                key={option.tag}
                onPress={() => toggle(option.tag)}
                
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                style={({ pressed }) => [styles.row,
                  { borderBottomColor: borderColor },
                  isSelected ? { backgroundColor: selectedRowBg } : null, pressed && { opacity: activeOpacity.default }]}
              >
                <View style={styles.rowText}>
                  <ThemedText style={[styles.rowLabel, { color: textColor }]}>{option.label}</ThemedText>
                  {option.nativeLabel && option.nativeLabel !== option.label ? (
                    <ThemedText style={[styles.rowSub, { color: subduedColor }]}>
                      {option.nativeLabel} · {option.tag}
                    </ThemedText>
                  ) : (
                    <ThemedText style={[styles.rowSub, { color: subduedColor }]}>{option.tag}</ThemedText>
                  )}
                </View>
                {isSelected ? (
                  <IconSymbol
                    name="checkmark.circle.fill"
                    size={fontSize.xl}
                    color={semanticColors.systemBlue}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: layout.hairline,
  },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, flex: 1, textAlign: 'center' },
  subhead: {
    fontSize: fontSize.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: fontSize.base, paddingVertical: spacing.xs },
  list: { paddingBottom: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: fontSize.base, fontWeight: fontWeight.medium },
  rowSub: { fontSize: fontSize.sm, marginTop: 2 },
});
