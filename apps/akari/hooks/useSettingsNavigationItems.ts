import Constants from 'expo-constants';
import { useMemo } from 'react';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTranslation } from '@/hooks/useTranslation';

export type SettingsNavigationItem = {
  key: string;
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  label: string;
  route: string;
};

export function useSettingsNavigationItems() {
  const { t } = useTranslation();

  const variant =
    typeof Constants.expoConfig?.extra?.variant === 'string'
      ? (Constants.expoConfig.extra?.variant as string)
      : undefined;
  const showDevelopmentSection = __DEV__ || (variant ? variant !== 'production' : false);

  return useMemo(() => {
    const items: SettingsNavigationItem[] = [
      {
        key: 'account',
        icon: 'person.crop.circle',
        label: t('settings.account'),
        route: '/(tabs)/settings/account',
      },
      {
        key: 'notifications',
        icon: 'bell.fill',
        label: t('settings.notifications'),
        route: '/(tabs)/settings/notifications',
      },
      {
        key: 'languages',
        icon: 'globe',
        label: t('settings.language'),
        route: '/(tabs)/settings/languages',
      },
      {
        key: 'about',
        icon: 'info.circle.fill',
        label: t('settings.about'),
        route: '/(tabs)/settings/about',
      },
    ];

    if (showDevelopmentSection) {
      items.push({
        key: 'development',
        icon: 'hammer.fill',
        label: t('settings.development'),
        route: '/(tabs)/settings/development',
      });
    }

    return items;
  }, [showDevelopmentSection, t]);
}
