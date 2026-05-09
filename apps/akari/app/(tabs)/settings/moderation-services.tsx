import React, { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Image } from '@/components/Image';
import { SettingsSection } from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { fontSize, fontWeight, hitSlop, layout, radius, spacing } from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useUpdateLabelersPref } from '@/hooks/mutations/useUpdateLabelersPref';
import {
  BSKY_DEFAULT_LABELER_DID,
  useLabelers,
} from '@/hooks/queries/useLabelers';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

const AVATAR_SIZE = 40;

export default function ModerationServicesScreen() {
  const borderColor = useBorderColor();
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const { t } = useTranslation();
  const { showToast } = useToast();

  const labelersQuery = useLabelers();
  const updateLabelers = useUpdateLabelersPref();

  // useLabelers always merges in BSKY_DEFAULT_LABELER_DID; we want it
  // pinned at the top and non-removable. Other entries reflect what the
  // user has actually subscribed to.
  const { defaultLabeler, customLabelers } = useMemo(() => {
    const views = labelersQuery.data ?? [];
    const def = views.find((v) => v.creator.did === BSKY_DEFAULT_LABELER_DID);
    const custom = views.filter((v) => v.creator.did !== BSKY_DEFAULT_LABELER_DID);
    return { defaultLabeler: def, customLabelers: custom };
  }, [labelersQuery.data]);

  const handleRemove = useCallback(
    (did: string) => {
      updateLabelers.mutate(
        (current) => current.filter((entry) => entry.did !== did),
        {
          onError: () => showToast({ type: 'error', message: t('common.somethingWentWrong') }),
        },
      );
    },
    [showToast, t, updateLabelers],
  );

  const isPending = updateLabelers.isPending;

  return (
    <SettingsSubpageLayout title={t('settings.moderationServices')}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <ThemedView style={[styles.introCard, { borderColor }]}>
          <ThemedText style={[styles.introText, { color: subduedColor }]}>
            {t('settings.moderationServicesIntro')}
          </ThemedText>
        </ThemedView>

        <SettingsSection>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            {labelersQuery.isLoading ? (
              <View style={styles.emptyState}>
                <ThemedText style={[styles.emptyText, { color: subduedColor }]}>
                  {t('common.loading')}
                </ThemedText>
              </View>
            ) : (
              <>
                {defaultLabeler ? (
                  <LabelerRow
                    avatar={defaultLabeler.creator.avatar}
                    borderColor={borderColor}
                    description={(defaultLabeler.creator as { description?: string }).description}
                    handle={defaultLabeler.creator.handle}
                    isLast={customLabelers.length === 0}
                    name={defaultLabeler.creator.displayName ?? defaultLabeler.creator.handle}
                    subduedColor={subduedColor}
                    textColor={textColor}
                  />
                ) : null}
                {customLabelers.length === 0 && !defaultLabeler ? (
                  <View style={styles.emptyState}>
                    <ThemedText style={[styles.emptyText, { color: subduedColor }]}>
                      {t('settings.moderationServicesEmpty')}
                    </ThemedText>
                  </View>
                ) : null}
                {customLabelers.map((labeler, index) => (
                  <LabelerRow
                    key={labeler.creator.did}
                    avatar={labeler.creator.avatar}
                    borderColor={borderColor}
                    description={(labeler.creator as { description?: string }).description}
                    handle={labeler.creator.handle}
                    isLast={index === customLabelers.length - 1}
                    name={labeler.creator.displayName ?? labeler.creator.handle}
                    subduedColor={subduedColor}
                    textColor={textColor}
                    onRemove={() => handleRemove(labeler.creator.did)}
                    removeDisabled={isPending}
                    removeLabel={t('settings.modListUnsubscribe')}
                    tintColor={tintColor}
                  />
                ))}
              </>
            )}
          </ThemedView>
        </SettingsSection>
      </ScrollView>
    </SettingsSubpageLayout>
  );
}

type LabelerRowProps = {
  avatar?: string;
  borderColor: string;
  description?: string;
  handle: string;
  isLast: boolean;
  name: string;
  onRemove?: () => void;
  removeDisabled?: boolean;
  removeLabel?: string;
  subduedColor: string;
  textColor: string;
  tintColor?: string;
};

function LabelerRow({
  avatar,
  borderColor,
  description,
  handle,
  isLast,
  name,
  onRemove,
  removeDisabled,
  removeLabel,
  subduedColor,
  textColor,
  tintColor,
}: LabelerRowProps) {
  return (
    <View
      style={[
        styles.row,
        !isLast && {
          borderBottomColor: borderColor,
          borderBottomWidth: layout.hairline,
        },
      ]}
    >
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder, { borderColor }]}>
          <IconSymbol name="shield.checkered" size={18} color={subduedColor} />
        </View>
      )}
      <View style={styles.rowText}>
        <ThemedText style={[styles.rowName, { color: textColor }]} numberOfLines={1}>
          {name}
        </ThemedText>
        <ThemedText style={[styles.rowHandle, { color: subduedColor }]} numberOfLines={1}>
          @{handle}
        </ThemedText>
        {description ? (
          <ThemedText style={[styles.rowDescription, { color: subduedColor }]} numberOfLines={2}>
            {description}
          </ThemedText>
        ) : null}
      </View>
      {onRemove && tintColor && removeLabel ? (
        <Pressable
          onPress={onRemove}
          disabled={removeDisabled}
          accessibilityRole="button"
          accessibilityLabel={removeLabel}
          hitSlop={hitSlop}
          style={({ pressed }) => [
            styles.actionButton,
            { borderColor: tintColor },
            pressed && { opacity: 0.7 },
            removeDisabled && styles.disabled,
          ]}
        >
          <ThemedText style={[styles.actionText, { color: tintColor }]}>
            {removeLabel}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  contentContainer: { paddingBottom: spacing.xxl },
  introCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderWidth: layout.hairline,
  },
  introText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
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
    alignItems: 'flex-start',
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
  rowText: { flex: 1 },
  rowName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  rowHandle: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  rowDescription: {
    fontSize: fontSize.sm,
    marginTop: 4,
    lineHeight: 18,
  },
  actionButton: {
    borderWidth: layout.hairline,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  actionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  disabled: {
    opacity: 0.5,
  },
});
