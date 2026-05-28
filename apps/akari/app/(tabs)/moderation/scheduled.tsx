import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Badge, humanEventType, eventTone } from '@/app/(tabs)/moderation/index';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { fontSize, fontWeight, spacing } from '@/constants/tokens';
import { webColumnSideBorders, webScreenContainer } from '@/constants/webStyles';
import { useOzoneMembership } from '@/hooks/queries/useOzoneMembership';
import {
  useCancelOzoneScheduledActions,
  useOzoneScheduledActions,
  type OzoneScheduledStatus,
} from '@/hooks/queries/useOzoneScheduledActions';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { formatRelativeTime } from '@/utils/timeUtils';

const STATUS_TABS: { label: string; value: OzoneScheduledStatus }[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'Executed', value: 'executed' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Failed', value: 'failed' },
];

/**
 * Scheduled actions list. Shows actions queued via `scheduleAction` and
 * lets pending ones be cancelled. Scheduling new actions happens from
 * the per-subject detail pane (follow-up; the lexicon supports it).
 */
export default function ScheduledScreen() {
  const { t } = useTranslation();
  const borderColor = useBorderColor();
  const secondary = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const dangerColor = useThemeColor({ light: '#dc2626', dark: '#ef4444' }, 'tint');
  const accent = useThemeColor({}, 'tint');

  const { data: membership } = useOzoneMembership();
  const [status, setStatus] = useState<OzoneScheduledStatus>('pending');
  const { data: actions } = useOzoneScheduledActions([status]);
  const cancel = useCancelOzoneScheduledActions();

  if (!membership?.isMod) {
    return (
      <ThemedView style={Platform.OS === 'web' ? webScreenContainer : styles.container}>
        <Stack.Screen options={{ title: t('moderation.scheduled.title') }} />
        <ThemedText style={[styles.placeholder, { color: secondary }]}>
          {t('moderation.scheduled.notModeratorPlaceholder')}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={Platform.OS === 'web' ? webScreenContainer : styles.container}>
      <Stack.Screen options={{ title: t('moderation.scheduled.title') }} />
      <View
        style={[
          styles.tabBar,
          { borderBottomColor: borderColor },
          webColumnSideBorders(borderColor),
        ]}
      >
        {STATUS_TABS.map((tab) => (
          <Pressable
            key={tab.value}
            onPress={() => setStatus(tab.value)}
            style={({ pressed }) => [
              styles.tabButton,
              pressed && { opacity: 0.6 },
            ]}
          >
            <ThemedText
              style={[
                styles.tabLabel,
                status === tab.value ? { color: accent, fontWeight: fontWeight.semibold } : { color: secondary },
              ]}
            >
              {tab.label}
            </ThemedText>
            <View
              style={[
                styles.tabIndicator,
                status === tab.value ? { backgroundColor: accent } : null,
              ]}
            />
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {actions && actions.length === 0 ? (
          <ThemedText style={[styles.placeholder, { color: secondary }]}>
            {t('moderation.scheduled.nothingScheduled')}
          </ThemedText>
        ) : (
          (actions ?? []).map((action, index) => {
            const id =
              typeof action.id === 'number' || typeof action.id === 'string' ? action.id : index;
            const event = action.action as { $type?: string; comment?: string } | undefined;
            const subject = action.subject as string | undefined;
            const executeAt = action.executeAt as string | undefined;
            return (
              <View
                key={String(id)}
                style={[
                  styles.row,
                  { borderBottomColor: borderColor },
                  webColumnSideBorders(borderColor),
                ]}
              >
                <View style={styles.rowBody}>
                  <View style={styles.rowHeader}>
                    <Badge label={humanEventType(event?.$type)} tone={eventTone(event?.$type)} />
                    {executeAt ? (
                      <ThemedText style={[styles.rowMeta, { color: secondary }]}>
                        {`runs ${formatRelativeTime(executeAt)}`}
                      </ThemedText>
                    ) : null}
                  </View>
                  {subject ? (
                    <ThemedText style={[styles.rowSubject, { color: secondary }]} numberOfLines={1} selectable>
                      {subject}
                    </ThemedText>
                  ) : null}
                  {event?.comment ? (
                    <ThemedText style={styles.rowComment} numberOfLines={3}>
                      {event.comment}
                    </ThemedText>
                  ) : null}
                </View>
                {status === 'pending' && subject ? (
                  <Pressable
                    onPress={() => cancel.mutate({ subjects: [subject] })}
                    disabled={cancel.isPending}
                    style={({ pressed }) => [
                      styles.cancelButton,
                      { borderColor: dangerColor },
                      pressed && { opacity: 0.6 },
                    ]}
                  >
                    <ThemedText style={[styles.cancelLabel, { color: dangerColor }]}>
                      {cancel.isPending ? t('moderation.scheduled.cancelling') : t('moderation.scheduled.cancel')}
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: fontSize.sm,
  },
  tabIndicator: {
    height: 2,
    width: '100%',
    marginTop: spacing.xs,
    borderRadius: 1,
  },
  list: {
    paddingBottom: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowMeta: {
    fontSize: fontSize.sm,
  },
  rowSubject: {
    fontSize: fontSize.sm,
    fontFamily: 'Menlo, Consolas, monospace',
  },
  rowComment: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  cancelButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'center',
  },
  cancelLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  placeholder: {
    padding: spacing.lg,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
});
