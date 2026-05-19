import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { OzoneSubject } from 'bluesky-ozone';

import {
  Avatar,
  Badge,
  describeSubject,
  eventTone,
  humanEventType,
  humanReviewState,
  readAvatar,
  shortDid,
  toEmitSubject,
} from '@/app/(tabs)/moderation/index';
import { OzoneActionSheet } from '@/components/moderation/OzoneActionSheet';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { fontSize, fontWeight, spacing } from '@/constants/tokens';
import { webColumnSideBorders, webScreenContainer } from '@/constants/webStyles';
import { useDialogManager } from '@/contexts/DialogContext';
import {
  useOzoneSubjectEvents,
  useOzoneSubjectStatus,
} from '@/hooks/queries/useOzoneSubject';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { formatRelativeTime } from '@/utils/timeUtils';

/**
 * Per-subject moderation detail. Subject ref is the route param (URI-
 * decoded): a DID for accounts, an AT URI for records.
 *
 * Layout:
 *   ┌─────────────────────────────────────────────┐
 *   │ Subject preview (avatar + handle + badges)  │
 *   │ ─────────────────────────────────────────── │
 *   │ Take action button                          │
 *   │ ─────────────────────────────────────────── │
 *   │ Event history (most recent first)           │
 *   └─────────────────────────────────────────────┘
 */
export default function SubjectDetailScreen() {
  const params = useLocalSearchParams<{ ref?: string | string[] }>();
  const ref = decodeRef(params.ref);
  const borderColor = useBorderColor();
  const secondary = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const accent = useThemeColor({}, 'tint');

  const { data: status, isLoading: statusLoading } = useOzoneSubjectStatus(ref);
  const { data: history, isLoading: historyLoading } = useOzoneSubjectEvents(ref);

  const subjectLabel = useMemo(
    () => (status ? describeSubject(status.subject, status.subjectRepoHandle) : ref ?? 'unknown'),
    [status, ref],
  );
  const avatar = status ? readAvatar(status.accountStats) : undefined;
  const handle = status?.subjectRepoHandle;
  const actionSubject = status ? toEmitSubject(status.subject) : null;
  const isAccount = Boolean(ref?.startsWith('did:'));

  const dialogManager = useDialogManager();
  const openAction = () => {
    if (!actionSubject) return;
    const id = 'ozone-action';
    dialogManager.open({
      id,
      component: (
        <OzoneActionSheet
          subject={actionSubject as OzoneSubject | null}
          subjectLabel={subjectLabel}
          subjectAvatar={avatar}
          subjectHandle={handle}
          onClose={() => dialogManager.close(id)}
        />
      ),
    });
  };

  return (
    <ThemedView style={Platform.OS === 'web' ? webScreenContainer : styles.container}>
      <Stack.Screen options={{ title: 'Subject' }} />

      <View
        style={[
          styles.previewCard,
          { borderBottomColor: borderColor },
          webColumnSideBorders(borderColor),
        ]}
      >
        <View style={styles.previewHeader}>
          <Avatar uri={avatar} handle={handle ?? ref} size={56} />
          <View style={styles.previewMeta}>
            <ThemedText style={styles.previewTitle} numberOfLines={1}>
              {subjectLabel}
            </ThemedText>
            <ThemedText style={[styles.previewKind, { color: secondary }]}>
              {isAccount ? 'Account' : 'Record'}
            </ThemedText>
            {ref && !ref.startsWith('did:') ? (
              <ThemedText style={[styles.previewUri, { color: secondary }]} selectable numberOfLines={1}>
                {ref}
              </ThemedText>
            ) : null}
          </View>
        </View>
        {status ? (
          <View style={styles.previewBadges}>
            <Badge label={humanReviewState(status.reviewState)} />
            {status.takendown ? <Badge label="taken down" tone="danger" /> : null}
            {status.appealed ? <Badge label="appealed" tone="warn" /> : null}
            {typeof status.priorityScore === 'number' ? (
              <Badge label={`p${status.priorityScore}`} tone="accent" />
            ) : null}
            {status.tags?.map((t) => <Badge key={t} label={t} />)}
          </View>
        ) : null}
        {actionSubject ? (
          <Pressable
            accessibilityRole="button"
            onPress={openAction}
            style={({ pressed }) => [
              styles.actionButton,
              { borderColor: accent },
              pressed && { opacity: 0.6 },
            ]}
          >
            <ThemedText style={[styles.actionLabel, { color: accent }]}>Take action</ThemedText>
          </Pressable>
        ) : null}
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        <View
          style={[
            styles.sectionHeader,
            { borderBottomColor: borderColor },
            webColumnSideBorders(borderColor),
          ]}
        >
          <ThemedText style={styles.sectionTitle}>Event history</ThemedText>
        </View>
        {statusLoading || historyLoading ? (
          <ThemedText style={[styles.placeholder, { color: secondary }]}>Loading…</ThemedText>
        ) : !history || history.length === 0 ? (
          <ThemedText style={[styles.placeholder, { color: secondary }]}>
            No events for this subject yet.
          </ThemedText>
        ) : (
          history.map((e) => (
            <View
              key={`e-${e.id}`}
              style={[
                styles.eventRow,
                { borderBottomColor: borderColor },
                webColumnSideBorders(borderColor),
              ]}
            >
              <Avatar uri={e.creatorAvatar} handle={e.creatorHandle ?? e.createdBy} size={32} />
              <View style={styles.eventBody}>
                <View style={styles.eventTitleRow}>
                  <ThemedText style={{ fontWeight: fontWeight.semibold }} numberOfLines={1}>
                    {e.creatorHandle ?? shortDid(e.createdBy)}
                  </ThemedText>
                  <Badge label={humanEventType(e.event.$type)} tone={eventTone(e.event.$type)} />
                  <View style={styles.eventSpacer} />
                  <ThemedText style={[styles.eventMeta, { color: secondary }]}>
                    {formatRelativeTime(e.createdAt)}
                  </ThemedText>
                </View>
                {readEventComment(e.event) ? (
                  <ThemedText style={[styles.eventComment]} numberOfLines={4}>
                    {readEventComment(e.event)}
                  </ThemedText>
                ) : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

function decodeRef(raw: string | string[] | undefined): string | undefined {
  if (!raw) return undefined;
  const value = Array.isArray(raw) ? raw.join('/') : raw;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function readEventComment(event: Record<string, unknown>): string | undefined {
  const c = event.comment;
  return typeof c === 'string' ? c : undefined;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  previewCard: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  previewHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  previewMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  previewTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  previewKind: {
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewUri: {
    fontSize: fontSize.xs,
    fontFamily: 'Menlo, Consolas, monospace',
  },
  previewBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  actionButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
    borderWidth: 1,
  },
  actionLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  list: { flex: 1 },
  listContent: { paddingBottom: spacing.xxl },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  eventBody: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  eventTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  eventSpacer: { flex: 1 },
  eventMeta: {
    fontSize: fontSize.xs,
  },
  eventComment: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  placeholder: {
    padding: spacing.lg,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
});
