import { router } from 'expo-router';

import { EmptyState } from '@/components/EmptyState';
import { useTranslation } from '@/hooks/useTranslation';

type UnavailableWithoutAppViewProps = {
  /** Short feature label used in the title, e.g. "Search" or "Notifications". */
  feature?: string;
  /** Override the body text. Defaults to a generic explanation. */
  subtitle?: string;
  testID?: string;
};

/**
 * Standard empty-state shown when the user has disabled the AppView but is
 * looking at a screen that genuinely needs one. The CTA jumps to the network
 * settings so they can flip the toggle back on.
 */
export function UnavailableWithoutAppView({ feature, subtitle, testID }: UnavailableWithoutAppViewProps) {
  const { t } = useTranslation();
  const title = feature
    ? t('settings.appView.unavailable.titleFor', { feature })
    : t('settings.appView.unavailable.title');
  return (
    <EmptyState
      title={title}
      subtitle={subtitle ?? t('settings.appView.unavailable.body')}
      action={{
        label: t('settings.appView.unavailable.openSettings'),
        onPress: () => router.push('/(tabs)/settings/network'),
      }}
      testID={testID ?? 'unavailable-without-appview'}
    />
  );
}
