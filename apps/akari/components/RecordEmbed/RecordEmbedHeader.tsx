import { StyleSheet } from 'react-native';

import type { BlueskyVerification } from '@/bluesky-api';
import { AvatarOrInitial } from '@/components/AvatarOrInitial';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { VerificationBadge } from '@/components/VerificationBadge';
import { PressableLink } from '@/components/ui/PressableLink';
import { fontSize, fontWeight, spacing } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { formatRelativeTime } from '@/utils/timeUtils';

export type RecordEmbedHeaderAuthor = {
  did?: string;
  handle: string;
  displayName: string;
  avatar?: string;
  verification?: BlueskyVerification;
};

export type RecordEmbedHeaderProps = {
  authorInfo: RecordEmbedHeaderAuthor | null;
  authorHref: string;
  blockingMessage: string | null;
  indexedAt: string | undefined;
  onAuthorPress: () => void;
};

export function RecordEmbedHeader({
  authorInfo,
  authorHref,
  blockingMessage,
  indexedAt,
  onAuthorPress,
}: RecordEmbedHeaderProps) {
  const { t } = useTranslation();
  const textColor = useThemeColor({ light: '#000000', dark: '#ffffff' }, 'text');
  const secondaryTextColor = useThemeColor({ light: '#666666', dark: '#999999' }, 'text');

  return (
    <ThemedView style={styles.header}>
      {authorInfo ? (
        <PressableLink href={authorHref} onPress={onAuthorPress} style={styles.authorSection}>
          <AvatarOrInitial
            uri={authorInfo.avatar}
            seed={authorInfo.displayName || authorInfo.handle}
            size={28}
          />
          <ThemedView style={styles.authorInfo}>
            <ThemedView style={styles.displayNameRow}>
              <ThemedText style={[styles.displayName, { color: textColor }]} numberOfLines={1}>
                {authorInfo.displayName}
              </ThemedText>
              <VerificationBadge
                subjectDid={authorInfo.did}
                verification={authorInfo.verification}
                subjectHandle={authorInfo.handle}
                subjectDisplayName={authorInfo.displayName}
                size={fontSize.base}
              />
            </ThemedView>
            <ThemedText style={[styles.handle, { color: secondaryTextColor }]}>
              @{authorInfo.handle}
            </ThemedText>
            {blockingMessage ? (
              <ThemedText style={[styles.blockingMessage, { color: secondaryTextColor }]}>
                {blockingMessage}
              </ThemedText>
            ) : null}
          </ThemedView>
        </PressableLink>
      ) : (
        <ThemedView style={styles.authorSection}>
          <AvatarOrInitial uri={undefined} seed="?" size={28} />
          <ThemedView style={styles.authorInfo}>
            <ThemedText style={[styles.displayName, { color: textColor }]}>
              {blockingMessage}
            </ThemedText>
            <ThemedText style={[styles.handle, { color: secondaryTextColor }]}>
              {t('common.block')}
            </ThemedText>
          </ThemedView>
        </ThemedView>
      )}
      <ThemedText style={[styles.timestamp, { color: secondaryTextColor }]}>
        {indexedAt ? formatRelativeTime(indexedAt) : ''}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 6,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    flex: 1,
  },
  authorInfo: {
    flex: 1,
  },
  displayNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  displayName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    flexShrink: 1,
  },
  handle: {
    fontSize: fontSize.xs,
  },
  timestamp: {
    fontSize: 10,
  },
  blockingMessage: {
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: spacing.xxs,
  },
});

