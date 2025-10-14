import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Switch } from 'react-native';

import {
  SettingsRow,
  SettingsSection,
  type SettingsRowDescriptor,
} from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { ThemedView } from '@/components/ThemedView';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useNotImplementedToast } from '@/hooks/useNotImplementedToast';
import { useSetTabBarPreference } from '@/hooks/mutations/useSetTabBarPreference';
import { useTabBarPreference } from '@/hooks/queries/useTabBarPreference';
import { useTranslation } from '@/hooks/useTranslation';

export default function AppearanceSettingsScreen() {
  const borderColor = useBorderColor();
  const showNotImplemented = useNotImplementedToast();
  const { t } = useTranslation();
  const { data: tabBarPreference = 'custom' } = useTabBarPreference();
  const { mutate: setTabBarPreference, isPending } = useSetTabBarPreference();

  const nativeTabsEnabled = tabBarPreference === 'native';

  const handleToggleNativeTabs = useCallback(
    (enabled: boolean) => {
      setTabBarPreference(enabled ? 'native' : 'custom');
    },
    [setTabBarPreference],
  );

  const appearanceRows = useMemo<SettingsRowDescriptor[]>(
    () => [
      {
        key: 'native-tabs',
        icon: 'square.grid.2x2',
        label: t('settings.nativeTabBar'),
        description: t('settings.nativeTabBarDescription'),
        accessory: (
          <Switch
            accessibilityLabel={t('settings.nativeTabBar')}
            onValueChange={handleToggleNativeTabs}
            value={nativeTabsEnabled}
            disabled={isPending}
          />
        ),
      },
      {
        key: 'color-mode',
        icon: 'circle.lefthalf.filled',
        label: t('settings.colorMode'),
        onPress: showNotImplemented,
      },
      {
        key: 'theme',
        icon: 'paintbrush.fill',
        label: t('settings.theme'),
        onPress: showNotImplemented,
      },
      {
        key: 'font-size',
        icon: 'textformat.size.larger',
        label: t('settings.fontSize'),
        onPress: showNotImplemented,
      },
    ],
    [handleToggleNativeTabs, isPending, nativeTabsEnabled, showNotImplemented, t],
  );

  return (
    <SettingsSubpageLayout title={t('settings.appearance')}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <SettingsSection isFirst>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            {appearanceRows.map((item, index) => (
              <SettingsRow
                key={item.key}
                borderColor={borderColor}
                icon={item.icon}
                label={item.label}
                onPress={item.onPress}
                showDivider={index < appearanceRows.length - 1}
                accessory={item.accessory}
              />
            ))}
          </ThemedView>
        </SettingsSection>
      </ScrollView>
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
    marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
});

