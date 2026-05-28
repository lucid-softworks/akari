import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SettingsSection } from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { SettingsScroll } from '@/components/settings/SettingsScroll';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import {
  activeOpacity,
  fontSize,
  fontWeight,
  layout,
  radius,
  spacing,
} from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useUpdateInterests } from '@/hooks/mutations/useUpdateInterests';
import { useInterests } from '@/hooks/queries/useInterests';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * The same starter set Bluesky's onboarding uses. Server stores the
 * raw tag string verbatim; we render the localised label via
 * `settings.interest.<tag>` falling back to the tag itself.
 */
const INTEREST_TAGS = [
  'art',
  'books',
  'comedy',
  'comics',
  'culture',
  'education',
  'food',
  'gaming',
  'movies',
  'music',
  'nature',
  'news',
  'pets',
  'photography',
  'politics',
  'science',
  'sports',
  'tech',
  'tv',
  'writers',
] as const;

export default function YourInterestsScreen() {
  const borderColor = useBorderColor();
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const textColor = useThemeColor({}, 'text');
  const { t } = useTranslation();
  const { showToast } = useToast();

  const interests = useInterests();
  const update = useUpdateInterests();

  const selectedSet = useMemo(() => new Set(interests.data), [interests.data]);

  const handleToggle = useCallback(
    (tag: string) => {
      update.mutate(
        (current) => {
          const set = new Set(current);
          if (set.has(tag)) set.delete(tag);
          else set.add(tag);
          return Array.from(set);
        },
        {
          onError: () =>
            showToast({ type: 'error', message: t('settings.yourInterestsSaveFailed') }),
        },
      );
    },
    [showToast, t, update],
  );

  return (
    <SettingsSubpageLayout title={t('settings.yourInterests')}>
      <SettingsScroll
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <ThemedText style={[styles.intro, { color: subduedColor }]}>
          {t('settings.yourInterestsIntro')}
        </ThemedText>

        <SettingsSection>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <View style={styles.chipsContainer}>
              {INTEREST_TAGS.map((tag) => {
                const isSelected = selectedSet.has(tag);
                const label = t(`settings.interest.${tag}` as 'settings.interest.art');
                return (
                  <Pressable
                    key={tag}
                    onPress={() => handleToggle(tag)}
                    disabled={update.isPending}
                    style={({ pressed }) => [
                      styles.chip,
                      {
                        borderColor: isSelected ? accentColor : borderColor,
                        backgroundColor: isSelected ? `${accentColor}1A` : 'transparent',
                      },
                      pressed && { opacity: activeOpacity.default },
                      update.isPending && styles.disabled,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <ThemedText
                      style={[
                        styles.chipLabel,
                        { color: isSelected ? accentColor : textColor },
                      ]}
                    >
                      {label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </ThemedView>
        </SettingsSection>

        {interests.data.length === 0 && !interests.isLoading ? (
          <ThemedText style={[styles.emptyHelper, { color: subduedColor }]}>
            {t('settings.yourInterestsEmpty')}
          </ThemedText>
        ) : null}
      </SettingsScroll>
    </SettingsSubpageLayout>
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
  sectionCard: {
    marginHorizontal: spacing.lg,
    borderWidth: layout.hairline,
    backgroundColor: 'transparent',
    padding: spacing.md,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderWidth: layout.hairline,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  emptyHelper: {
    marginHorizontal: spacing.lg,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
