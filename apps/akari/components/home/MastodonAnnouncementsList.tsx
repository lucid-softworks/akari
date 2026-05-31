import React from 'react';
import { StyleSheet, View } from 'react-native';

import { MastodonAnnouncementCard } from '@/components/home/MastodonAnnouncementCard';
import { spacing } from '@/constants/tokens';
import { useMastodonAnnouncements } from '@/hooks/queries/useMastodonAnnouncements';

/**
 * Wrapper around `useMastodonAnnouncements` that renders an undismissed
 * announcement card per item. Rendered as the home tab's
 * `ListHeaderComponent` for Mastodon accounts — empty list → empty view
 * (renders nothing).
 */
export function MastodonAnnouncementsList() {
  const { data: announcements } = useMastodonAnnouncements();
  // Defensive `read === false` filter on top of the server-side default
  // (`with_dismissed=false`) — some custom servers return all entries.
  const items = (announcements ?? []).filter((a) => !a.read);
  if (items.length === 0) return null;
  return (
    <View style={styles.container}>
      {items.map((a) => (
        <MastodonAnnouncementCard key={a.id} announcement={a} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
});
