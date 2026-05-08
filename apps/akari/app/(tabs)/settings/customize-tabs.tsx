import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, radius, fontSize, fontWeight, opacity, activeOpacity, layout } from '@/constants/tokens';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { ALL_TABS, type TabKey, useTabConfig } from '@/hooks/useTabConfig';

export default function CustomizeTabsScreen() {
  const { t } = useTranslation();
  const borderColor = useBorderColor();
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const iconColor = useThemeColor({}, 'icon');
  const secondaryText = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const cardBg = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');

  const { visibleTabs, setVisibleTabs, resetToDefault } = useTabConfig();
  const [localTabs, setLocalTabs] = useState<TabKey[]>(visibleTabs);

  const isTabEnabled = (key: TabKey) => localTabs.includes(key);
  const tabMeta = ALL_TABS.find.bind(ALL_TABS);

  const handleToggle = useCallback((key: TabKey, enabled: boolean) => {
    setLocalTabs((prev) => {
      let next: TabKey[];
      if (enabled) {
        next = [...prev, key];
      } else {
        next = prev.filter((k) => k !== key);
      }
      setVisibleTabs(next);
      return next;
    });
  }, [setVisibleTabs]);

  const handleMoveUp = useCallback((key: TabKey) => {
    setLocalTabs((prev) => {
      const idx = prev.indexOf(key);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      setVisibleTabs(next);
      return next;
    });
  }, [setVisibleTabs]);

  const handleMoveDown = useCallback((key: TabKey) => {
    setLocalTabs((prev) => {
      const idx = prev.indexOf(key);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      setVisibleTabs(next);
      return next;
    });
  }, [setVisibleTabs]);

  const handleReset = useCallback(() => {
    resetToDefault();
    setLocalTabs(['index', 'search', 'notifications', 'bookmarks', 'profile', 'settings']);
  }, [resetToDefault]);

  return (
    <SettingsSubpageLayout title={t('settings.customizeTabs')}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={[styles.description, { color: secondaryText }]}>
          {t('settings.customizeTabsDescription')}
        </ThemedText>

        {/* Visible tabs (ordered) */}
        <ThemedText style={styles.sectionTitle}>{t('settings.visibleTabs')}</ThemedText>
        <ThemedView style={[styles.card, { borderColor, backgroundColor: cardBg }]}>
          {localTabs.map((key, index) => {
            const meta = ALL_TABS.find((tab) => tab.key === key);
            if (!meta) return null;
            return (
              <View key={key} style={[styles.row, index < localTabs.length - 1 && { borderBottomWidth: layout.hairline, borderBottomColor: borderColor }]}>
                <View style={styles.rowLeft}>
                  <IconSymbol name={meta.icon as any} size={20} color={accentColor} />
                  <ThemedText style={styles.rowLabel}>{meta.label}</ThemedText>
                </View>
                <View style={styles.rowRight}>
                  {!meta.alwaysVisible ? (
                    <Pressable onPress={() => handleMoveUp(key)}  style={({ pressed }) => [styles.arrowButton, pressed && { opacity: activeOpacity.default }]} disabled={index === 0}>
                      <IconSymbol name="chevron.up" size={16} color={index === 0 ? borderColor : iconColor} />
                    </Pressable>
                  ) : null}
                  {!meta.alwaysVisible ? (
                    <Pressable onPress={() => handleMoveDown(key)}  style={({ pressed }) => [styles.arrowButton, pressed && { opacity: activeOpacity.default }]} disabled={index === localTabs.length - 1}>
                      <IconSymbol name="chevron.down" size={16} color={index === localTabs.length - 1 ? borderColor : iconColor} />
                    </Pressable>
                  ) : null}
                  {!meta.alwaysVisible ? (
                    <Switch
                      value={true}
                      onValueChange={(v) => handleToggle(key, v)}
                      trackColor={{ false: borderColor, true: accentColor }}
                    />
                  ) : (
                    <ThemedText style={[styles.alwaysOnLabel, { color: secondaryText }]}>{t('settings.alwaysOn')}</ThemedText>
                  )}
                </View>
              </View>
            );
          })}
        </ThemedView>

        {/* Hidden tabs */}
        {(() => {
          const localTabSet = new Set(localTabs);
          const hiddenTabs = ALL_TABS.filter((tab) => !localTabSet.has(tab.key));
          if (hiddenTabs.length === 0) return null;
          return (
          <>
            <ThemedText style={styles.sectionTitle}>{t('settings.hiddenTabs')}</ThemedText>
            <ThemedView style={[styles.card, { borderColor, backgroundColor: cardBg }]}>
              {hiddenTabs.map((meta, index, arr) => (
                <View key={meta.key} style={[styles.row, index < arr.length - 1 && { borderBottomWidth: layout.hairline, borderBottomColor: borderColor }]}>
                  <View style={styles.rowLeft}>
                    <IconSymbol name={meta.icon as any} size={20} color={iconColor} />
                    <ThemedText style={[styles.rowLabel, { opacity: opacity.secondary }]}>{meta.label}</ThemedText>
                  </View>
                  <Switch
                    value={false}
                    onValueChange={(v) => handleToggle(meta.key, v)}
                    trackColor={{ false: borderColor, true: accentColor }}
                  />
                </View>
              ))}
            </ThemedView>
          </>
          );
        })()}

        {/* Reset */}
        <Pressable style={({ pressed }) => [styles.resetButton, pressed && { opacity: activeOpacity.default }]} onPress={handleReset} >
          <ThemedText style={[styles.resetText, { color: accentColor }]}>{t('settings.resetToDefault')}</ThemedText>
        </Pressable>
      </ScrollView>
    </SettingsSubpageLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxxl,
  },
  description: {
    fontSize: fontSize.base,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: opacity.secondary,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  card: {
    borderWidth: layout.hairline,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  arrowButton: {
    padding: spacing.xs,
  },
  alwaysOnLabel: {
    fontSize: fontSize.sm,
    fontStyle: 'italic',
  },
  resetButton: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginTop: spacing.xl,
  },
  resetText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});
