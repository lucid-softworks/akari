import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { activeOpacity, fontSize, fontWeight, hexToRgba, layout, radius, semanticColors, spacing } from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useVotePoll } from '@/hooks/mutations/useVotePoll';
import { useIsPollClosed, usePoll, usePollVotes } from '@/hooks/queries/usePoll';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type PollEmbedProps = {
  /** at:// URI of the `tech.tokimeki.poll.poll` record. */
  pollUri: string;
};

function formatRemaining(endsAt: string): string {
  const ms = Date.parse(endsAt) - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return '';
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export function PollEmbed({ pollUri }: PollEmbedProps) {
  const { t } = useTranslation();
  const borderColor = useBorderColor();
  const secondary = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const tint = semanticColors.systemBlue;
  const { isGuest, promptSignIn } = useRequireAuth();
  const { showToast } = useToast();

  const { data: poll, isLoading } = usePoll(pollUri);
  const isClosed = useIsPollClosed(poll?.value.endsAt);
  const [interacted, setInteracted] = useState(false);
  const showResults = isClosed || interacted;
  const { data: votes } = usePollVotes(pollUri, showResults);
  const voteMutation = useVotePoll();

  if (isLoading || !poll) {
    return (
      <ThemedView style={[styles.container, styles.loading, { borderColor }]}>
        <ThemedText style={{ color: secondary }}>•••</ThemedText>
      </ThemedView>
    );
  }

  const options = poll.value.options ?? [];
  const myOptionIndex = votes?.myOptionIndex ?? null;
  const total = votes?.total ?? 0;

  const handleVote = (index: number) => {
    if (isClosed || myOptionIndex !== null || voteMutation.isPending) return;
    if (isGuest) {
      promptSignIn();
      return;
    }
    setInteracted(true);
    voteMutation.mutate(
      { poll: { uri: poll.uri, cid: poll.cid }, optionIndex: index },
      {
        onError: () => {
          setInteracted(false);
          showToast({ message: t('poll.voteFailed'), type: 'error' });
        },
      },
    );
  };

  return (
    <ThemedView style={[styles.container, { borderColor }]}>
      {options.map((label, index) => {
        if (showResults) {
          const count = votes?.counts[index] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const mine = myOptionIndex === index;
          return (
            <View key={index} style={[styles.resultRow, { borderColor }]}>
              <View
                style={[styles.resultFill, { width: `${pct}%`, backgroundColor: hexToRgba(tint, mine ? 0.3 : 0.12) }]}
              />
              <View style={styles.resultContent}>
                <View style={styles.resultLabelWrap}>
                  {mine ? <ThemedText style={[styles.check, { color: tint }]}>✓ </ThemedText> : null}
                  <ThemedText style={[styles.optionLabel, mine && styles.optionLabelMine]} numberOfLines={2}>
                    {label}
                  </ThemedText>
                </View>
                <ThemedText style={styles.pct}>{pct}%</ThemedText>
              </View>
            </View>
          );
        }
        return (
          <Pressable
            key={index}
            onPress={() => handleVote(index)}
            style={({ pressed }) => [styles.optionButton, { borderColor: tint }, pressed && { opacity: activeOpacity.default }]}
            accessibilityRole="button"
          >
            <ThemedText style={[styles.optionButtonText, { color: tint }]} numberOfLines={2}>
              {label}
            </ThemedText>
          </Pressable>
        );
      })}

      <ThemedText style={[styles.footer, { color: secondary }]}>
        {total === 1 ? t('poll.vote', { count: total }) : t('poll.votes', { count: total })}
        {'  ·  '}
        {isClosed ? t('poll.ended') : t('poll.endsIn', { time: formatRemaining(poll.value.endsAt) })}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    borderWidth: layout.hairline,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  loading: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  optionButton: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  optionButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  resultRow: {
    borderWidth: layout.hairline,
    borderRadius: radius.sm,
    overflow: 'hidden',
    justifyContent: 'center',
    minHeight: 40,
  },
  resultFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  resultLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  check: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  optionLabel: {
    fontSize: fontSize.base,
    flexShrink: 1,
  },
  optionLabelMine: {
    fontWeight: fontWeight.semibold,
  },
  pct: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  footer: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
});
