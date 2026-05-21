import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { GuestSignInRequired } from '@/components/GuestSignInRequired';
import { NotificationSettings } from '@/components/NotificationSettings';
import {
  SettingsRow,
  SettingsSection,
  type SettingsRowDescriptor,
} from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { SettingsScroll } from '@/components/settings/SettingsScroll';
import { ThemedView } from '@/components/ThemedView';
import { useIsGuest } from '@/hooks/queries/useIsGuest';
import { useNotificationPreferences } from '@/hooks/queries/useNotificationPreferences';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useTranslation } from '@/hooks/useTranslation';

import {
  CATEGORY_DEFS,
  type CategoryKey,
} from './_notificationCategories';

const CATEGORY_ORDER: CategoryKey[] = [
  'likes',
  'newFollowers',
  'replies',
  'mentions',
  'quotes',
  'reposts',
  'activityFromOthers',
  'likesOfYourReposts',
  'repostsOfYourReposts',
  'everythingElse',
];

const ICON_FOR_CATEGORY: Record<CategoryKey, React.ComponentProps<typeof SettingsRow>['icon']> = {
  likes: 'heart.fill',
  newFollowers: 'person.badge.plus',
  replies: 'text.bubble.fill',
  mentions: 'at',
  quotes: 'quote.bubble.fill',
  reposts: 'arrow.2.squarepath',
  activityFromOthers: 'bell.fill',
  likesOfYourReposts: 'heart.circle.fill',
  repostsOfYourReposts: 'arrow.triangle.2.circlepath',
  everythingElse: 'ellipsis.circle.fill',
};

export default function NotificationSettingsScreen() {
  const borderColor = useBorderColor();
  const { t } = useTranslation();
  const isGuest = useIsGuest();
  const prefsQuery = useNotificationPreferences();

  const categoryRows = useMemo<SettingsRowDescriptor[]>(() => {
    return CATEGORY_ORDER.map((key) => {
      const def = CATEGORY_DEFS[key];
      const pref = prefsQuery.data?.[def.lexiconKey] as
        | { include?: 'all' | 'follows' | 'accepted'; list?: boolean; push?: boolean }
        | undefined;

      // Default to "everything on" when no pref is set yet — matches
      // atproto's behaviour of treating unset categories as fully enabled.
      const list = pref?.list ?? true;
      const push = pref?.push ?? true;
      const include = pref?.include ?? 'all';

      const parts: string[] = [];
      if (def.kind !== 'chat' && list) parts.push(t('settings.notificationChannel.inApp'));
      if (push) parts.push(t('settings.notificationChannel.push'));
      if (def.kind === 'filterable') {
        parts.push(
          include === 'follows'
            ? t('settings.notificationFilterFollows')
            : t('settings.notificationRecipient.everyone'),
        );
      } else if (def.kind === 'chat') {
        parts.push(
          include === 'accepted'
            ? t('settings.notificationFilterAccepted')
            : t('settings.notificationRecipient.everyone'),
        );
      }

      return {
        key: `notif-${key}`,
        icon: ICON_FOR_CATEGORY[key],
        label: t(`settings.notificationCategory.${key}` as const),
        description: parts.join(', '),
        onPress: () => router.push({ pathname: '/(tabs)/settings/notification-category', params: { category: key } }),
      };
    });
  }, [prefsQuery.data, t]);

  if (isGuest) {
    return <GuestSignInRequired title={t('settings.notifications')} />;
  }

  return (
    <SettingsSubpageLayout title={t('settings.notifications')}>
      <SettingsScroll
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <SettingsSection isFirst>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            {categoryRows.map((item, index) => (
              <SettingsRow
                key={item.key}
                borderColor={borderColor}
                description={item.description}
                icon={item.icon}
                label={item.label}
                onPress={item.onPress}
                showDivider={index < categoryRows.length - 1}
              />
            ))}
          </ThemedView>
        </SettingsSection>

        <SettingsSection>
          <ThemedView style={[styles.sectionCard, { borderColor, overflow: 'hidden' }]}>
            <NotificationSettings />
          </ThemedView>
        </SettingsSection>
      </SettingsScroll>
    </SettingsSubpageLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  contentContainer: { paddingBottom: 32 },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
});
