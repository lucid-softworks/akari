import { Pressable, StyleSheet, View } from 'react-native';

import { SkippedRow } from '@/components/settings/following-cleanup/SkippedRow';
import { SettingsSection } from '@/components/settings/SettingsList';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { activeOpacity, fontSize, fontWeight, hitSlop, layout, spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';
import type { FollowingCleanupEntry } from '@/utils/followingCleanupController';

export type SkippedSectionProps = {
  skippedCount: number;
  skippedEntries: FollowingCleanupEntry[];
  profileHref: (handle: string) => string;
  onUnskip: (did: string) => void;
  onClearAll: () => void;
  borderColor: string;
  textColor: string;
  subduedColor: string;
  tintColor: string;
};

export function SkippedSection({
  skippedCount,
  skippedEntries,
  profileHref,
  onUnskip,
  onClearAll,
  borderColor,
  textColor,
  subduedColor,
  tintColor,
}: SkippedSectionProps) {
  const { t } = useTranslation();
  return (
    <SettingsSection
      title={t('settings.followingCleanup.skippedHeader', { count: skippedCount })}
    >
      <ThemedView style={[styles.sectionCard, { borderColor }]}>
        <View style={styles.skippedHelp}>
          <ThemedText style={[styles.skippedHelpText, { color: subduedColor }]}>
            {t('settings.followingCleanup.skippedHint')}
          </ThemedText>
          <Pressable
            onPress={onClearAll}
            accessibilityRole="button"
            hitSlop={hitSlop}
            style={({ pressed }) => [pressed && { opacity: activeOpacity.default }]}
          >
            <ThemedText style={[styles.skippedClearLink, { color: tintColor }]}>
              {t('settings.followingCleanup.skippedClearAll')}
            </ThemedText>
          </Pressable>
        </View>
        {skippedEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText style={[styles.emptyText, { color: subduedColor }]}>
              {t('settings.followingCleanup.skippedScanAgainHint')}
            </ThemedText>
          </View>
        ) : (
          skippedEntries.map((entry, index) => (
            <SkippedRow
              key={entry.profile.did}
              entry={entry}
              isLast={index === skippedEntries.length - 1}
              href={profileHref(entry.profile.handle)}
              onUnskip={() => onUnskip(entry.profile.did)}
              borderColor={borderColor}
              textColor={textColor}
              subduedColor={subduedColor}
              tintColor={tintColor}
              unskipLabel={t('settings.followingCleanup.unskip')}
            />
          ))
        )}
      </ThemedView>
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
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
  skippedHelp: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  skippedHelpText: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  skippedClearLink: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});
