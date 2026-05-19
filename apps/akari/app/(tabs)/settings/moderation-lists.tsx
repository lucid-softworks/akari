import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Image } from '@/components/Image';
import { SettingsSection } from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { SettingsScroll } from '@/components/settings/SettingsScroll';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { fontSize, fontWeight, hitSlop, layout, radius, spacing } from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useBlockActorList } from '@/hooks/mutations/useBlockActorList';
import { useMuteActorList } from '@/hooks/mutations/useMuteActorList';
import {
  useModerationLists,
  type ModerationListSubscription,
} from '@/hooks/queries/useModerationLists';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

const AVATAR_SIZE = 36;

export default function ModerationListsScreen() {
  const borderColor = useBorderColor();
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const { t } = useTranslation();
  const { showToast } = useToast();

  const query = useModerationLists();
  const muteList = useMuteActorList();
  const blockList = useBlockActorList();

  const subscriptions = query.data ?? [];
  const isPending = muteList.isPending || blockList.isPending;

  const handleUnsubscribe = useCallback(
    (sub: ModerationListSubscription) => {
      const onError = () =>
        showToast({ type: 'error', message: t('settings.modListUnsubscribeFailed') });

      // A list might be both muted *and* blocked; tear down both
      // subscriptions in parallel rather than only one.
      if (sub.muted) {
        muteList.mutate({ list: sub.list.uri, action: 'unmute' }, { onError });
      }
      if (sub.blockedUri) {
        blockList.mutate({ action: 'unblock', listblockUri: sub.blockedUri }, { onError });
      }
    },
    [blockList, muteList, showToast, t],
  );

  return (
    <SettingsSubpageLayout title={t('settings.moderationLists')}>
      <SettingsScroll
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <SettingsSection isFirst>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            {query.isLoading ? (
              <View style={styles.emptyState}>
                <ThemedText style={[styles.emptyText, { color: subduedColor }]}>
                  {t('common.loading')}
                </ThemedText>
              </View>
            ) : subscriptions.length === 0 ? (
              <View style={styles.emptyState}>
                <ThemedText style={[styles.emptyText, { color: subduedColor }]}>
                  {t('settings.moderationListsEmpty')}
                </ThemedText>
              </View>
            ) : (
              subscriptions.map((sub, index) => {
                const list = sub.list;
                const labels: string[] = [];
                if (sub.muted) labels.push(t('settings.modListSubscriptionMute'));
                if (sub.blockedUri) labels.push(t('settings.modListSubscriptionBlock'));
                const subscriptionLabel = labels.join(' · ');

                return (
                  <View
                    key={list.uri}
                    style={[
                      styles.row,
                      index < subscriptions.length - 1 && {
                        borderBottomColor: borderColor,
                        borderBottomWidth: layout.hairline,
                      },
                    ]}
                  >
                    {list.avatar ? (
                      <Image source={{ uri: list.avatar }} style={styles.avatar} contentFit="cover" />
                    ) : (
                      <View style={[styles.avatar, styles.avatarPlaceholder, { borderColor }]}>
                        <IconSymbol name="person.3.fill" size={16} color={subduedColor} />
                      </View>
                    )}
                    <View style={styles.rowText}>
                      <ThemedText style={[styles.rowName, { color: textColor }]} numberOfLines={1}>
                        {list.name}
                      </ThemedText>
                      {list.creator?.handle ? (
                        <ThemedText
                          style={[styles.rowHandle, { color: subduedColor }]}
                          numberOfLines={1}
                        >
                          @{list.creator.handle}
                        </ThemedText>
                      ) : null}
                      {subscriptionLabel ? (
                        <ThemedText
                          style={[styles.rowMeta, { color: subduedColor }]}
                          numberOfLines={1}
                        >
                          {subscriptionLabel}
                        </ThemedText>
                      ) : null}
                    </View>
                    <Pressable
                      onPress={() => handleUnsubscribe(sub)}
                      disabled={isPending}
                      accessibilityRole="button"
                      accessibilityLabel={t('settings.modListUnsubscribe')}
                      hitSlop={hitSlop}
                      style={({ pressed }) => [
                        styles.actionButton,
                        { borderColor: tintColor },
                        pressed && { opacity: 0.7 },
                        isPending && styles.disabled,
                      ]}
                    >
                      <ThemedText style={[styles.actionText, { color: tintColor }]}>
                        {t('settings.modListUnsubscribe')}
                      </ThemedText>
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
    paddingBottom: spacing.xxl,
  },
  sectionCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: layout.hairline,
    backgroundColor: 'transparent',
  },
  emptyState: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.base,
    textAlign: 'center',
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.sm,
  },
  avatarPlaceholder: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  rowHandle: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  rowMeta: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  actionButton: {
    borderWidth: layout.hairline,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  actionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  disabled: {
    opacity: 0.5,
  },
});
