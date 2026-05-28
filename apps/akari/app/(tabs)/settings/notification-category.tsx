import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useReducer } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

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
import { useUpdateNotificationPreferences } from '@/hooks/mutations/useUpdateNotificationPreferences';
import { useNotificationPreferences } from '@/hooks/queries/useNotificationPreferences';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

import {
  CATEGORY_DEFS,
  isCategoryKey,
} from './_notificationCategories';

export default function NotificationCategoryScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const borderColor = useBorderColor();
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const { t } = useTranslation();
  const { showToast } = useToast();

  const prefsQuery = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  const categoryKey = isCategoryKey(params.category) ? params.category : null;
  const def = categoryKey ? CATEGORY_DEFS[categoryKey] : null;
  const lexiconKey = def?.lexiconKey;

  // Pull the current pref for this category from the loaded prefs blob so
  // the form starts pre-filled. Default to "show in inbox + push on" when
  // the user has never explicitly set this category.
  const currentPref = lexiconKey ? prefsQuery.data?.[lexiconKey] : undefined;

  type FormState = {
    include: 'all' | 'follows' | 'accepted';
    listOn: boolean;
    pushOn: boolean;
  };
  type FormAction = Partial<FormState>;
  const [form, updateForm] = useReducer(
    (state: FormState, patch: FormAction): FormState => ({ ...state, ...patch }),
    { include: 'all', listOn: true, pushOn: true },
  );
  const { include, listOn, pushOn } = form;
  const setInclude = useCallback(
    (next: FormState['include']) => updateForm({ include: next }),
    [],
  );
  const setListOn = useCallback(
    (next: boolean) => updateForm({ listOn: next }),
    [],
  );
  const setPushOn = useCallback(
    (next: boolean) => updateForm({ pushOn: next }),
    [],
  );

  useEffect(() => {
    if (!def || !currentPref) return;
    // The exact pref shape depends on `def.kind`; cast through `unknown`
    // since the discriminated union doesn't survive the lookup table.
    const raw = currentPref as { include?: string; list?: boolean; push?: boolean };
    if (def.kind === 'filterable') {
      updateForm({
        include: raw.include === 'follows' ? 'follows' : 'all',
        listOn: raw.list ?? true,
        pushOn: raw.push ?? true,
      });
    } else if (def.kind === 'chat') {
      updateForm({
        include: raw.include === 'accepted' ? 'accepted' : 'all',
        pushOn: raw.push ?? true,
      });
    } else {
      updateForm({
        listOn: raw.list ?? true,
        pushOn: raw.push ?? true,
      });
    }
  }, [currentPref, def]);

  if (!categoryKey || !def || !lexiconKey) {
    return (
      <SettingsSubpageLayout title={t('settings.notifications')}>
        <ThemedView style={[styles.notFoundCard, { borderColor }]}>
          <ThemedText style={[styles.notFoundText, { color: subduedColor }]}>
            {t('settings.notificationCategoryNotFound')}
          </ThemedText>
        </ThemedView>
      </SettingsSubpageLayout>
    );
  }

  const title = t(`settings.notificationCategory.${categoryKey}` as const);

  const handleSave = () => {
    let value: unknown;
    if (def.kind === 'filterable') {
      value = { include: include === 'follows' ? 'follows' : 'all', list: listOn, push: pushOn };
    } else if (def.kind === 'chat') {
      value = { include: include === 'accepted' ? 'accepted' : 'all', push: pushOn };
    } else {
      value = { list: listOn, push: pushOn };
    }
    update.mutate(
      { [lexiconKey]: value } as Parameters<typeof update.mutate>[0],
      {
        onError: () => showToast({ type: 'error', message: t('settings.notificationSaveFailed') }),
      },
    );
  };

  const includeOptions: { value: 'all' | 'follows' | 'accepted'; label: string }[] = (() => {
    if (def.kind === 'filterable') {
      return [
        { value: 'all', label: t('settings.notificationFilterAll') },
        { value: 'follows', label: t('settings.notificationFilterFollows') },
      ];
    }
    if (def.kind === 'chat') {
      return [
        { value: 'all', label: t('settings.notificationFilterAll') },
        { value: 'accepted', label: t('settings.notificationFilterAccepted') },
      ];
    }
    return [];
  })();

  return (
    <SettingsSubpageLayout title={title}>
      <SettingsScroll
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        {includeOptions.length > 0 ? (
          <SettingsSection isFirst title={t('settings.notificationFilter')}>
            <ThemedView style={[styles.sectionCard, { borderColor }]}>
              {includeOptions.map((opt, idx) => {
                const selected = include === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setInclude(opt.value)}
                    style={({ pressed }) => [
                      styles.optionRow,
                      idx < includeOptions.length - 1 && {
                        borderBottomColor: borderColor,
                        borderBottomWidth: layout.hairline,
                      },
                      pressed && { opacity: activeOpacity.default },
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <View
                      style={[
                        styles.radio,
                        { borderColor: selected ? accentColor : borderColor },
                        selected && { backgroundColor: accentColor },
                      ]}
                    />
                    <ThemedText style={styles.optionLabel}>{opt.label}</ThemedText>
                  </Pressable>
                );
              })}
            </ThemedView>
          </SettingsSection>
        ) : null}

        <SettingsSection isFirst={includeOptions.length === 0}>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            {def.kind !== 'chat' ? (
              <ThemedView
                style={[
                  styles.toggleRow,
                  { borderBottomColor: borderColor, borderBottomWidth: layout.hairline },
                ]}
              >
                <ThemedText style={styles.toggleLabel}>
                  {t('settings.notificationInAppLabel')}
                </ThemedText>
                <Switch value={listOn} onValueChange={setListOn} />
              </ThemedView>
            ) : null}
            <ThemedView style={styles.toggleRow}>
              <ThemedText style={styles.toggleLabel}>
                {t('settings.notificationPushLabel')}
              </ThemedText>
              <Switch value={pushOn} onValueChange={setPushOn} />
            </ThemedView>
          </ThemedView>
        </SettingsSection>

        <Pressable
          onPress={handleSave}
          disabled={update.isPending}
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: accentColor },
            pressed && { opacity: activeOpacity.default },
            update.isPending && styles.disabled,
          ]}
          accessibilityRole="button"
        >
          <ThemedText style={styles.saveButtonText}>{t('common.save')}</ThemedText>
        </Pressable>
      </SettingsScroll>
    </SettingsSubpageLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  contentContainer: { paddingBottom: spacing.xxl },
  sectionCard: {
    marginHorizontal: spacing.lg,
    borderWidth: layout.hairline,
    backgroundColor: 'transparent',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  optionLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  toggleLabel: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  saveButton: {
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: radius.xl,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  notFoundCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderWidth: layout.hairline,
  },
  notFoundText: {
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
