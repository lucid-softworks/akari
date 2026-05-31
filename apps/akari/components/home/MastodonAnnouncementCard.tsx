import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { fontSize, fontWeight, layout, opacity, radius, spacing } from '@/constants/tokens';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useMastodonDismissAnnouncement } from '@/hooks/mutations/useMastodonDismissAnnouncement';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import type { MastodonAnnouncement } from '@/utils/mastodon/announcements';
import { htmlToPlainText } from '@/utils/mastodon/html';

type MastodonAnnouncementCardProps = {
  announcement: MastodonAnnouncement;
};

/**
 * Single instance-wide announcement, shown above the Mastodon home feed.
 * Plain-text rendering for v1 (same `htmlToPlainText` helper as posts);
 * the close button POSTs to `/dismiss` and optimistically removes the
 * card from the cached list so it disappears without a refetch round-trip.
 */
export function MastodonAnnouncementCard({ announcement }: MastodonAnnouncementCardProps) {
  const { t } = useTranslation();
  const borderColor = useBorderColor();
  const tintColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const iconColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const dismiss = useMastodonDismissAnnouncement();

  const body = htmlToPlainText(announcement.content);

  const onDismiss = useCallback(() => {
    dismiss.mutate(announcement.id);
  }, [announcement.id, dismiss]);

  return (
    <View style={[styles.container, { borderColor }]}>
      <View style={[styles.accent, { backgroundColor: tintColor }]} />
      <View style={styles.body}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>
            {t('home.announcementsTitle')}
          </ThemedText>
          <Pressable
            onPress={onDismiss}
            disabled={dismiss.isPending}
            accessibilityRole="button"
            accessibilityLabel={t('home.announcementDismiss')}
            style={({ pressed }) => [
              styles.dismissButton,
              (pressed || dismiss.isPending) && { opacity: opacity.disabled },
            ]}
          >
            <IconSymbol name="xmark" size={fontSize.base} color={iconColor} />
          </Pressable>
        </View>
        {body ? <ThemedText style={styles.text}>{body}</ThemedText> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: layout.hairline,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  accent: {
    width: 4,
  },
  body: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dismissButton: {
    padding: spacing.xs,
  },
  text: {
    fontSize: fontSize.base,
    lineHeight: 20,
  },
});
