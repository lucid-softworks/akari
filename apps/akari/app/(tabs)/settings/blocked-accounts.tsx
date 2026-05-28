import React, { useCallback, useMemo } from 'react';
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
import { useBlockUser } from '@/hooks/mutations/useBlockUser';
import { useBlocks } from '@/hooks/queries/useBlocks';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

const AVATAR_SIZE = 36;

export default function BlockedAccountsScreen() {
  const borderColor = useBorderColor();
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const { t } = useTranslation();
  const { showToast } = useToast();

  const query = useBlocks();
  const mutate = useBlockUser();

  const accounts = useMemo(
    () => query.data?.pages.flatMap((p) => p.blocks) ?? [],
    [query.data],
  );

  const handleUnblock = useCallback(
    (did: string, blockUri: string | undefined) => {
      // The block record's AT URI is required to delete it. atproto returns
      // it on the profile's `viewer.blocking` field for accounts the viewer
      // is blocking. If it's missing for some reason, refuse — silently
      // calling unblock with a stale URI would error and the row wouldn't
      // disappear.
      if (!blockUri) {
        showToast({ type: 'error', message: t('settings.unblockFailed') });
        return;
      }
      mutate.mutate(
        { did, blockUri, action: 'unblock' },
        {
          onError: () => showToast({ type: 'error', message: t('settings.unblockFailed') }),
        },
      );
    },
    [mutate, showToast, t],
  );

  return (
    <SettingsSubpageLayout title={t('settings.blockedAccounts')}>
      <SettingsScroll
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        onScrollEndDrag={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
        }}
      >
        <ThemedView style={[styles.introCard, { borderColor }]}>
          <ThemedText style={[styles.introText, { color: subduedColor }]}>
            {t('settings.blockedAccountsIntro')}
          </ThemedText>
        </ThemedView>

        <SettingsSection>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            {query.isLoading ? (
              <View style={styles.emptyState}>
                <ThemedText style={[styles.emptyText, { color: subduedColor }]}>
                  {t('common.loading')}
                </ThemedText>
              </View>
            ) : accounts.length === 0 ? (
              <View style={styles.emptyState}>
                <ThemedText style={[styles.emptyText, { color: subduedColor }]}>
                  {t('settings.blockedAccountsEmpty')}
                </ThemedText>
              </View>
            ) : (
              accounts.map((profile, index) => (
                <View
                  key={profile.did}
                  style={[
                    styles.row,
                    index < accounts.length - 1 && {
                      borderBottomColor: borderColor,
                      borderBottomWidth: layout.hairline,
                    },
                  ]}
                >
                  {profile.avatar ? (
                    <Image source={{ uri: profile.avatar }} style={styles.avatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder, { borderColor }]}>
                      <IconSymbol name="person.fill" size={16} color={subduedColor} />
                    </View>
                  )}
                  <View style={styles.rowText}>
                    <ThemedText style={[styles.rowName, { color: textColor }]} numberOfLines={1}>
                      {profile.displayName?.trim() || profile.handle}
                    </ThemedText>
                    <ThemedText
                      style={[styles.rowHandle, { color: subduedColor }]}
                      numberOfLines={1}
                    >
                      @{profile.handle}
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={() => handleUnblock(profile.did, profile.viewer?.blocking)}
                    disabled={mutate.isPending}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.unblock')}
                    hitSlop={hitSlop}
                    style={({ pressed }) => [
                      styles.actionButton,
                      { borderColor: tintColor },
                      pressed && { opacity: 0.7 },
                      mutate.isPending && styles.disabled,
                    ]}
                  >
                    <ThemedText style={[styles.actionText, { color: tintColor }]}>
                      {t('common.unblock')}
                    </ThemedText>
                  </Pressable>
                </View>
              ))
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
  introCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderWidth: layout.hairline,
  },
  introText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
  sectionCard: {
    marginHorizontal: spacing.lg,
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
    borderRadius: AVATAR_SIZE / 2,
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
