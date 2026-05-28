import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Input } from '@/components/ui/Input';

import type { BlueskyMutedWord } from '@/bluesky-api';
import { SettingsSection } from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { SettingsScroll } from '@/components/settings/SettingsScroll';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { activeOpacity, hitSlop, radius } from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useUpdateMutedWords } from '@/hooks/mutations/useUpdateMutedWords';
import { useMutedWords } from '@/hooks/queries/useMutedWords';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type Target = 'both' | 'content' | 'tag';
type Duration = 'forever' | '24h' | '7d' | '30d';

const TARGET_OPTIONS: Target[] = ['both', 'content', 'tag'];
const DURATION_OPTIONS: Duration[] = ['forever', '24h', '7d', '30d'];

const DURATION_MS: Record<Exclude<Duration, 'forever'>, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

const DURATION_LABEL_KEY = {
  forever: 'settings.mutedWordDurationForever',
  '24h': 'settings.mutedWordDuration24h',
  '7d': 'settings.mutedWordDuration7d',
  '30d': 'settings.mutedWordDuration30d',
} as const;

function targetsForOption(option: Target): ('content' | 'tag')[] {
  if (option === 'content') return ['content'];
  if (option === 'tag') return ['tag'];
  return ['content', 'tag'];
}

function optionForTargets(targets: ('content' | 'tag')[]): Target {
  const hasContent = targets.includes('content');
  const hasTag = targets.includes('tag');
  if (hasContent && hasTag) return 'both';
  if (hasTag) return 'tag';
  return 'content';
}

function expiresAtForDuration(duration: Duration): string | undefined {
  if (duration === 'forever') return undefined;
  return new Date(Date.now() + DURATION_MS[duration]).toISOString();
}

function isExpired(entry: BlueskyMutedWord): boolean {
  if (!entry.expiresAt) return false;
  const t = Date.parse(entry.expiresAt);
  return Number.isFinite(t) && t < Date.now();
}

export default function MutedWordsScreen() {
  const borderColor = useBorderColor();
  const textColor = useThemeColor({}, 'text');
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const checkboxBorder = useThemeColor({ light: '#D1D5DB', dark: '#3A3A3C' }, 'text');
  const { t } = useTranslation();
  const { data: mutedWords, isLoading } = useMutedWords();
  const updateMutation = useUpdateMutedWords();
  const { showToast } = useToast();

  const [draftValue, setDraftValue] = useState('');
  const [draftTarget, setDraftTarget] = useState<Target>('both');
  const [draftDuration, setDraftDuration] = useState<Duration>('forever');
  const [draftExcludeFollowing, setDraftExcludeFollowing] = useState(false);

  const handleAdd = useCallback(() => {
    const value = draftValue.trim();
    if (!value) return;
    const trimmed = value.replace(/^#+/, '');
    if (!trimmed) return;

    // Pre-flight dedup so we don't push the same word twice. Server-side
    // dedup isn't guaranteed across clients.
    if (mutedWords.some((entry) => entry.value.toLowerCase() === trimmed.toLowerCase())) {
      showToast({ type: 'error', message: t('settings.mutedWordAlreadyExists') });
      return;
    }

    const newEntry: BlueskyMutedWord = {
      value: trimmed,
      targets: targetsForOption(draftTarget),
      actorTarget: draftExcludeFollowing ? 'exclude-following' : 'all',
      ...(expiresAtForDuration(draftDuration)
        ? { expiresAt: expiresAtForDuration(draftDuration) }
        : {}),
    };

    updateMutation.mutate((current) => [...current, newEntry], {
      onSuccess: () => {
        setDraftValue('');
        setDraftTarget('both');
        setDraftDuration('forever');
        setDraftExcludeFollowing(false);
      },
      onError: () => {
        showToast({ type: 'error', message: t('settings.mutedWordSaveFailed') });
      },
    });
  }, [draftValue, draftTarget, draftDuration, draftExcludeFollowing, mutedWords, updateMutation, showToast, t]);

  const handleRemove = useCallback(
    (value: string) => {
      updateMutation.mutate(
        (current) => current.filter((entry) => entry.value !== value),
        {
          onError: () => {
            showToast({ type: 'error', message: t('settings.mutedWordSaveFailed') });
          },
        },
      );
    },
    [updateMutation, showToast, t],
  );

  const isSaving = updateMutation.isPending;

  return (
    <SettingsSubpageLayout title={t('settings.mutedWordsTags')}>
      <SettingsScroll
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <SettingsSection isFirst>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <View style={styles.formRow}>
              <Input
                variant="filled"
                size="lg"
                containerStyle={styles.inputBox}
                value={draftValue}
                onChangeText={setDraftValue}
                placeholder={t('settings.mutedWordPlaceholder')}
                placeholderTextColor={subduedColor}
                returnKeyType="done"
                onSubmitEditing={handleAdd}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <ThemedText style={[styles.fieldLabel, { color: subduedColor }]}>
                {t('settings.mutedWordDuration')}
              </ThemedText>
              <View style={styles.durationRow}>
                {DURATION_OPTIONS.map((option) => {
                  const selected = draftDuration === option;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => setDraftDuration(option)}
                      style={({ pressed }) => [
                        styles.durationOption,
                        {
                          borderColor: selected ? accentColor : borderColor,
                          backgroundColor: selected ? `${accentColor}1A` : 'transparent',
                        },
                        pressed && { opacity: activeOpacity.default },
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                    >
                      <ThemedText
                        style={[styles.durationLabel, selected && { color: accentColor, fontWeight: '600' }]}
                      >
                        {t(DURATION_LABEL_KEY[option])}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              <ThemedText style={[styles.fieldLabel, { color: subduedColor }]}>
                {t('settings.mutedWordTargetHeader')}
              </ThemedText>
              <View style={styles.segmented}>
                {TARGET_OPTIONS.map((option) => {
                  const selected = draftTarget === option;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => setDraftTarget(option)}
                      style={({ pressed }) => [
                        styles.segment,
                        {
                          borderColor,
                          backgroundColor: selected ? accentColor : 'transparent',
                        },
                        pressed && { opacity: activeOpacity.default },
                      ]}
                      accessibilityRole="button"
                    >
                      <ThemedText
                        style={[styles.segmentLabel, selected && { color: '#FFFFFF' }]}
                      >
                        {t(`settings.mutedWordTarget.${option}`)}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                onPress={() => setDraftExcludeFollowing((v) => !v)}
                style={({ pressed }) => [styles.checkboxRow, pressed && { opacity: activeOpacity.default }]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: draftExcludeFollowing }}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: draftExcludeFollowing ? accentColor : checkboxBorder,
                      backgroundColor: draftExcludeFollowing ? accentColor : 'transparent',
                    },
                  ]}
                >
                  {draftExcludeFollowing ? (
                    <IconSymbol name="checkmark" size={14} color="#FFFFFF" />
                  ) : null}
                </View>
                <ThemedText style={styles.checkboxLabel}>
                  {t('settings.mutedWordExcludeFollowing')}
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={handleAdd}
                disabled={isSaving || !draftValue.trim()}
                style={({ pressed }) => [
                  styles.addButton,
                  {
                    backgroundColor: accentColor,
                    opacity: isSaving || !draftValue.trim() ? 0.5 : 1,
                  },
                  pressed && { opacity: activeOpacity.default },
                ]}
                accessibilityRole="button"
              >
                <ThemedText style={styles.addButtonText}>{t('settings.mutedWordAdd')}</ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </SettingsSection>

        <SettingsSection>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <View style={styles.sectionHeader}>
              <ThemedText style={[styles.sectionHeaderText, { color: subduedColor }]}>
                {t('settings.mutedWordsListHeader')}
              </ThemedText>
            </View>
            {isLoading ? (
              <ThemedView style={styles.emptyState}>
                <ThemedText style={[styles.emptyText, { color: subduedColor }]}>
                  {t('common.loading')}
                </ThemedText>
              </ThemedView>
            ) : mutedWords.length === 0 ? (
              <ThemedView style={styles.emptyState}>
                <ThemedText style={[styles.emptyText, { color: subduedColor }]}>
                  {t('settings.mutedWordsEmpty')}
                </ThemedText>
              </ThemedView>
            ) : (
              mutedWords.map((entry, index) => {
                const expired = isExpired(entry);
                return (
                  <View
                    key={entry.value}
                    style={[
                      styles.listRow,
                      index < mutedWords.length - 1 && {
                        borderBottomColor: borderColor,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    <View style={styles.listRowText}>
                      <ThemedText style={styles.listRowValue} numberOfLines={1}>
                        {optionForTargets(entry.targets) === 'tag' ? `#${entry.value}` : entry.value}
                      </ThemedText>
                      <ThemedText style={[styles.listRowMeta, { color: subduedColor }]}>
                        {expired
                          ? t('settings.mutedWordExpired')
                          : t(`settings.mutedWordTargetLabel.${optionForTargets(entry.targets)}`)}
                      </ThemedText>
                    </View>
                    <Pressable
                      onPress={() => handleRemove(entry.value)}
                      accessibilityRole="button"
                      accessibilityLabel={t('settings.mutedWordRemove')}
                      hitSlop={hitSlop}
                      style={({ pressed }) => [styles.removeButton, pressed && { opacity: 0.7 }]}
                      disabled={isSaving}
                    >
                      <IconSymbol name="minus.circle.fill" size={22} color={subduedColor} />
                    </Pressable>
                  </View>
                );
              })
            )}
          </ThemedView>
        </SettingsSection>
      </SettingsScroll>
    </SettingsSubpageLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  sectionCard: {
    marginHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  formRow: {
    padding: 12,
    gap: 8,
  },
  inputBox: {
    borderRadius: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginTop: 4,
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  durationOption: {
    flexGrow: 1,
    flexBasis: '22%',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  durationLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  segmented: {
    flexDirection: 'row',
    gap: 6,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  listRowText: {
    flex: 1,
  },
  listRowValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  listRowMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  removeButton: {
    padding: 4,
  },
  emptyState: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
