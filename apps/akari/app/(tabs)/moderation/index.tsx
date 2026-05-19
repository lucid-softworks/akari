import { Stack, router, type Href } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { OzoneSubject } from 'bluesky-ozone';

import { Image } from '@/components/Image';
import { OzoneActionSheet } from '@/components/moderation/OzoneActionSheet';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { fontSize, fontWeight, opacity, radius, spacing } from '@/constants/tokens';
import { webColumnSideBorders, webScreenContainer } from '@/constants/webStyles';
import { useOzoneEvents } from '@/hooks/queries/useOzoneEvents';
import { useOzoneMembership } from '@/hooks/queries/useOzoneMembership';
import { useOzoneQueue, type OzoneQueueFilters } from '@/hooks/queries/useOzoneQueue';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemeColor } from '@/hooks/useThemeColor';
import { formatRelativeTime } from '@/utils/timeUtils';

/**
 * Tier-1 moderation reader. Two tabs, both backed by real Ozone queries
 * (mocked on localhost web for offline UI testing):
 *  - Queue: open subject statuses, filterable by review state / flags.
 *  - Events: site-wide moderation event log (audit trail).
 *
 * Clicking a queue row navigates to the subject detail pane (full
 * event history + take-action button). Quick-action chips in each row
 * skip the detail step and open the action sheet directly.
 */
export default function ModerationScreen() {
  const insets = useSafeAreaInsets();
  const { isLargeScreen } = useResponsive();
  const borderColor = useBorderColor();
  const secondary = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');

  const { data: membership, isLoading: membershipLoading } = useOzoneMembership();
  const [tab, setTab] = useState<'queue' | 'events'>('queue');
  const [queueFilters, setQueueFilters] = useState<OzoneQueueFilters>({
    reviewState: 'tools.ozone.moderation.defs#reviewOpen',
    sortField: 'lastReportedAt',
    sortDirection: 'desc',
  });
  const [activeSubject, setActiveSubject] = useState<{
    subject: OzoneSubject;
    label: string;
    avatar?: string;
    handle?: string;
    snippet?: string;
  } | null>(null);

  const queue = useOzoneQueue(queueFilters);
  const events = useOzoneEvents();

  const flatStatuses = useMemo(
    () => queue.data?.pages.flatMap((p) => p.subjectStatuses) ?? [],
    [queue.data],
  );
  const flatEvents = useMemo(
    () => events.data?.pages.flatMap((p) => p.events) ?? [],
    [events.data],
  );

  const onLoadMore = useCallback(() => {
    if (tab === 'queue' && queue.hasNextPage && !queue.isFetchingNextPage) {
      void queue.fetchNextPage();
    } else if (tab === 'events' && events.hasNextPage && !events.isFetchingNextPage) {
      void events.fetchNextPage();
    }
  }, [tab, queue, events]);

  if (membershipLoading) {
    return (
      <ThemedView style={Platform.OS === 'web' ? webScreenContainer : styles.container}>
        <Stack.Screen options={{ title: 'Moderation' }} />
        <ThemedText style={[styles.placeholder, { color: secondary }]}>
          Checking moderator access…
        </ThemedText>
      </ThemedView>
    );
  }

  if (!membership?.isMod) {
    return (
      <ThemedView style={Platform.OS === 'web' ? webScreenContainer : styles.container}>
        <Stack.Screen options={{ title: 'Moderation' }} />
        <ThemedText style={[styles.placeholder, { color: secondary }]}>
          You are not a moderator on the configured Ozone service. Ask an
          admin to add you to the team, or change the Ozone DID in
          settings if you meant a different instance.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView
      style={[
        Platform.OS === 'web' ? webScreenContainer : styles.container,
        { paddingTop: isLargeScreen ? insets.top : 0 },
      ]}
    >
      <Stack.Screen options={{ title: 'Moderation' }} />

      <View
        style={[
          styles.tabBar,
          { borderBottomColor: borderColor },
          webColumnSideBorders(borderColor),
        ]}
      >
        <TabButton label="Queue" active={tab === 'queue'} onPress={() => setTab('queue')} />
        <TabButton label="Events" active={tab === 'events'} onPress={() => setTab('events')} />
        <View style={styles.tabBarSpacer} />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(tabs)/moderation/templates' as Href)}
          style={({ pressed }) => [styles.toolButton, pressed && { opacity: 0.6 }]}
        >
          <ThemedText style={[styles.toolButtonLabel, { color: secondary }]}>Templates</ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(tabs)/moderation/scheduled' as Href)}
          style={({ pressed }) => [styles.toolButton, pressed && { opacity: 0.6 }]}
        >
          <ThemedText style={[styles.toolButtonLabel, { color: secondary }]}>Scheduled</ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(tabs)/moderation/team' as Href)}
          style={({ pressed }) => [styles.toolButton, pressed && { opacity: 0.6 }]}
        >
          <ThemedText style={[styles.toolButtonLabel, { color: secondary }]}>Team</ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(tabs)/moderation/admin' as Href)}
          style={({ pressed }) => [styles.toolButton, pressed && { opacity: 0.6 }]}
        >
          <ThemedText style={[styles.toolButtonLabel, { color: secondary }]}>Admin</ThemedText>
        </Pressable>
      </View>

      {tab === 'queue' ? (
        <QueueFilterBar
          filters={queueFilters}
          onChange={setQueueFilters}
          borderColor={borderColor}
          secondary={secondary}
        />
      ) : null}

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        onScroll={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          const remaining = contentSize.height - (contentOffset.y + layoutMeasurement.height);
          if (remaining < 400) onLoadMore();
        }}
        scrollEventThrottle={250}
      >
        {tab === 'queue' ? (
          flatStatuses.length === 0 && !queue.isFetching ? (
            <ThemedText style={[styles.placeholder, { color: secondary }]}>
              Queue is empty.
            </ThemedText>
          ) : (
            flatStatuses.map((s) => (
              <QueueRow
                key={`s-${s.id}`}
                status={s}
                borderColor={borderColor}
                secondary={secondary}
                onAction={(subject, label, extras) =>
                  setActiveSubject({ subject, label, ...extras })
                }
              />
            ))
          )
        ) : flatEvents.length === 0 && !events.isFetching ? (
          <ThemedText style={[styles.placeholder, { color: secondary }]}>No events yet.</ThemedText>
        ) : (
          flatEvents.map((ev) => (
            <EventRow key={`e-${ev.id}`} event={ev} borderColor={borderColor} secondary={secondary} />
          ))
        )}
      </ScrollView>

      <OzoneActionSheet
        visible={!!activeSubject}
        subject={activeSubject?.subject ?? null}
        subjectLabel={activeSubject?.label}
        subjectAvatar={activeSubject?.avatar}
        subjectHandle={activeSubject?.handle}
        subjectSnippet={activeSubject?.snippet}
        onClose={() => setActiveSubject(null)}
      />
    </ThemedView>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const tint = useThemeColor({}, 'tint');
  const text = useThemeColor({}, 'text');
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tabButton, pressed && { opacity: 0.6 }]}>
      <ThemedText
        style={[
          styles.tabLabel,
          { color: active ? tint : text },
          active ? { fontWeight: fontWeight.semibold } : null,
        ]}
      >
        {label}
      </ThemedText>
      <View style={[styles.tabIndicator, active ? { backgroundColor: tint } : null]} />
    </Pressable>
  );
}

const REVIEW_STATE_FILTERS: { label: string; value: string | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Open', value: 'tools.ozone.moderation.defs#reviewOpen' },
  { label: 'Escalated', value: 'tools.ozone.moderation.defs#reviewEscalated' },
  { label: 'Closed', value: 'tools.ozone.moderation.defs#reviewClosed' },
];

const SORT_FIELDS: { label: string; field: 'lastReportedAt' | 'lastReviewedAt' }[] = [
  { label: 'Newest reports', field: 'lastReportedAt' },
  { label: 'Newest reviews', field: 'lastReviewedAt' },
];

function QueueFilterBar({
  filters,
  onChange,
  borderColor,
  secondary,
}: {
  filters: OzoneQueueFilters;
  onChange: (next: OzoneQueueFilters) => void;
  borderColor: string;
  secondary: string;
}) {
  const tint = useThemeColor({}, 'tint');
  const update = (patch: Partial<OzoneQueueFilters>) => onChange({ ...filters, ...patch });
  const chip = (label: string, active: boolean, onPress: () => void) => (
    <Pressable
      key={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        { borderColor: active ? tint : borderColor, backgroundColor: active ? tint + '22' : 'transparent' },
        pressed && { opacity: 0.6 },
      ]}
    >
      <ThemedText
        style={[
          styles.filterChipText,
          { color: active ? tint : secondary, fontWeight: active ? fontWeight.semibold : '500' },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
  return (
    <View
      style={[
        styles.filterBar,
        { borderBottomColor: borderColor },
        webColumnSideBorders(borderColor),
      ]}
    >
      <View style={styles.filterRow}>
        {REVIEW_STATE_FILTERS.map((f) =>
          chip(f.label, filters.reviewState === f.value, () => update({ reviewState: f.value })),
        )}
        <View style={styles.filterSeparator} />
        {chip('Taken down', filters.takendown === true, () =>
          update({ takendown: filters.takendown === true ? undefined : true }),
        )}
        {chip('Appealed', filters.appealed === true, () =>
          update({ appealed: filters.appealed === true ? undefined : true }),
        )}
        {chip('Muted', filters.includeMuted === true, () =>
          update({ includeMuted: filters.includeMuted === true ? undefined : true }),
        )}
        <View style={styles.filterSeparator} />
        {SORT_FIELDS.map((s) =>
          chip(s.label, filters.sortField === s.field, () => update({ sortField: s.field })),
        )}
      </View>
    </View>
  );
}

function QueueRow({
  status,
  borderColor,
  secondary,
  onAction,
}: {
  status: import('bluesky-ozone').OzoneSubjectStatus;
  borderColor: string;
  secondary: string;
  onAction?: (
    subject: OzoneSubject,
    label: string,
    extras: { avatar?: string; handle?: string; snippet?: string },
  ) => void;
}) {
  const subjectLabel = describeSubject(status.subject, status.subjectRepoHandle);
  const reviewState = humanReviewState(status.reviewState);
  const actionSubject = toEmitSubject(status.subject);
  const avatar = readAvatar(status.accountStats);
  const snippet = status.comment ?? undefined;
  const subjectRef = subjectRefForRoute(status.subject);

  const handleRowPress = useCallback(() => {
    if (subjectRef) router.push(`/(tabs)/moderation/subject/${encodeURIComponent(subjectRef)}` as Href);
  }, [subjectRef]);
  const handleAction = useCallback(
    () =>
      actionSubject &&
      onAction?.(actionSubject, subjectLabel, {
        avatar,
        handle: status.subjectRepoHandle,
        snippet,
      }),
    [actionSubject, avatar, onAction, snippet, status.subjectRepoHandle, subjectLabel],
  );

  return (
    <Pressable
      onPress={handleRowPress}
      style={[styles.row, { borderBottomColor: borderColor }, webColumnSideBorders(borderColor)]}
    >
      <View style={styles.rowMain}>
        <Avatar uri={avatar} handle={status.subjectRepoHandle} size={40} />
        <View style={styles.rowBodyCol}>
          <View style={styles.rowHeader}>
            <ThemedText style={styles.rowTitle} numberOfLines={1}>
              {subjectLabel}
            </ThemedText>
            <ThemedText style={[styles.rowMeta, { color: secondary }]}>
              {formatRelativeTime(status.lastReportedAt ?? status.updatedAt)}
            </ThemedText>
          </View>
          <View style={styles.rowMetaRow}>
            <Badge label={reviewState} />
            {status.takendown ? <Badge label="taken down" tone="danger" /> : null}
            {status.appealed ? <Badge label="appealed" tone="warn" /> : null}
            {status.tags?.slice(0, 3).map((t) => <Badge key={t} label={t} />)}
            {typeof status.priorityScore === 'number' ? (
              <Badge label={`p${status.priorityScore}`} tone="accent" />
            ) : null}
          </View>
          {status.comment ? (
            <ThemedText style={[styles.rowBody, { color: secondary }]} numberOfLines={3}>
              {status.comment}
            </ThemedText>
          ) : null}
          {actionSubject ? (
            <View style={styles.rowActionsRow}>
              <Pressable
                onPress={handleAction}
                style={({ pressed }) => [
                  styles.inlineActionButton,
                  { borderColor },
                  pressed && { opacity: 0.6 },
                ]}
                accessibilityRole="button"
              >
                <ThemedText style={[styles.inlineActionLabel, { color: secondary }]}>
                  Take action
                </ThemedText>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export function toEmitSubject(subject: Record<string, unknown> | undefined): OzoneSubject | null {
  if (!subject) return null;
  const type = subject.$type as string | undefined;
  if (
    type === 'com.atproto.admin.defs#repoRef' ||
    type === 'tools.ozone.moderation.defs#repoRef'
  ) {
    const did = subject.did as string | undefined;
    if (!did) return null;
    return { $type: 'com.atproto.admin.defs#repoRef', did };
  }
  const uri = subject.uri as string | undefined;
  const cid = subject.cid as string | undefined;
  if (uri && cid) {
    return { $type: 'com.atproto.repo.strongRef', uri, cid };
  }
  return null;
}

/**
 * Stable string id for routing — DID for accounts, AT URI for records.
 * Caller URI-encodes before stuffing into the route param.
 */
function subjectRefForRoute(subject: Record<string, unknown> | undefined): string | null {
  if (!subject) return null;
  const did = subject.did as string | undefined;
  if (did) return did;
  const uri = subject.uri as string | undefined;
  return uri ?? null;
}

function EventRow({
  event,
  borderColor,
  secondary,
}: {
  event: import('bluesky-ozone').OzoneModEvent & {
    creatorAvatar?: string;
    subjectAvatar?: string;
  };
  borderColor: string;
  secondary: string;
}) {
  const type = humanEventType(event.event.$type);
  const tone = eventTone(event.event.$type);
  const subjectLabel = describeSubject(event.subject, event.subjectHandle);
  const actor = event.creatorHandle ?? shortDid(event.createdBy);
  const comment =
    typeof (event.event as { comment?: unknown }).comment === 'string'
      ? ((event.event as { comment: string }).comment)
      : undefined;
  const subjectRef = subjectRefForRoute(event.subject);
  return (
    <Pressable
      onPress={() => {
        if (subjectRef) router.push(`/(tabs)/moderation/subject/${encodeURIComponent(subjectRef)}` as Href);
      }}
      style={[styles.row, { borderBottomColor: borderColor }, webColumnSideBorders(borderColor)]}
    >
      <View style={styles.rowMain}>
        <Avatar uri={event.creatorAvatar} handle={event.creatorHandle ?? event.createdBy} size={40} />
        <View style={styles.rowBodyCol}>
          <View style={styles.rowHeader}>
            <View style={styles.eventTitleRow}>
              <ThemedText style={{ fontWeight: fontWeight.semibold }} numberOfLines={1}>
                {actor}
              </ThemedText>
              <Badge label={type} tone={tone} />
            </View>
            <ThemedText style={[styles.rowMeta, { color: secondary }]}>
              {formatRelativeTime(event.createdAt)}
            </ThemedText>
          </View>
          <View style={styles.eventSubjectRow}>
            <Avatar uri={event.subjectAvatar} handle={event.subjectHandle} size={20} />
            <ThemedText style={[styles.rowBody, { color: secondary }]} numberOfLines={2}>
              {subjectLabel}
            </ThemedText>
          </View>
          {comment ? (
            <ThemedText style={[styles.rowBody]} numberOfLines={4}>
              {comment}
            </ThemedText>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export function Avatar({ uri, handle, size }: { uri?: string; handle?: string; size: number }) {
  const bg = useThemeColor({ light: '#E5E7EB', dark: '#2d3133' }, 'background');
  const fg = useThemeColor({}, 'text');
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
      />
    );
  }
  const initial = (handle?.replace(/^@/, '')?.[0] ?? '?').toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <ThemedText style={{ fontSize: size * 0.45, fontWeight: fontWeight.semibold, color: fg }}>
        {initial}
      </ThemedText>
    </View>
  );
}

export function readAvatar(stats: unknown): string | undefined {
  if (!stats || typeof stats !== 'object') return undefined;
  const avatar = (stats as { avatar?: unknown }).avatar;
  return typeof avatar === 'string' ? avatar : undefined;
}

export function Badge({ label, tone }: { label: string; tone?: 'danger' | 'warn' | 'accent' }) {
  const neutralBg = useThemeColor({ light: '#E5E7EB', dark: '#2d3133' }, 'background');
  const dangerBg = useThemeColor({ light: '#fee2e2', dark: '#3f0d0d' }, 'background');
  const warnBg = useThemeColor({ light: '#fef3c7', dark: '#3a2e0c' }, 'background');
  const accentBg = useThemeColor({ light: '#dbeafe', dark: '#0c2740' }, 'background');
  const bg = tone === 'danger' ? dangerBg : tone === 'warn' ? warnBg : tone === 'accent' ? accentBg : neutralBg;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <ThemedText style={styles.badgeText}>{label}</ThemedText>
    </View>
  );
}

// ----- helpers ----------------------------------------------------------

export function describeSubject(subject: Record<string, unknown> | undefined, handle?: string): string {
  if (!subject) return handle ?? 'unknown';
  const type = subject.$type as string | undefined;
  const did = subject.did as string | undefined;
  const uri = subject.uri as string | undefined;
  if (type === 'com.atproto.admin.defs#repoRef' || type === 'tools.ozone.moderation.defs#repoRef') {
    return handle ? `@${handle}` : did ? shortDid(did) : 'repo';
  }
  if (uri) {
    return handle ? `@${handle} · ${shortRkey(uri)}` : uri;
  }
  if (did) return shortDid(did);
  return handle ?? 'unknown';
}

export function stripDefsPrefix(name: string): string {
  const hashIdx = name.lastIndexOf('#');
  return hashIdx === -1 ? name : name.slice(hashIdx + 1);
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  modEventComment: 'Comment',
  modEventAcknowledge: 'Acknowledged',
  modEventEscalate: 'Escalated',
  modEventResolveAppeal: 'Resolved appeal',
  modEventLabel: 'Labeled',
  modEventTakedown: 'Taken down',
  modEventReverseTakedown: 'Reversed takedown',
  modEventMute: 'Muted',
  modEventUnmute: 'Unmuted',
  modEventMuteReporter: 'Muted reporter',
  modEventUnmuteReporter: 'Unmuted reporter',
  modEventEmail: 'Emailed',
  modEventTag: 'Tagged',
  modEventDivert: 'Diverted',
  modEventPriorityScore: 'Set priority',
  modEventReport: 'Reported',
};

const REVIEW_STATE_LABELS: Record<string, string> = {
  reviewOpen: 'open',
  reviewEscalated: 'escalated',
  reviewClosed: 'closed',
  reviewNone: 'none',
};

export function humanEventType(rawType: string | undefined): string {
  const short = stripDefsPrefix(rawType ?? 'event');
  return EVENT_TYPE_LABELS[short] ?? short;
}

export function humanReviewState(raw: string | undefined): string {
  const short = stripDefsPrefix(raw ?? '');
  return REVIEW_STATE_LABELS[short] ?? short;
}

export function eventTone(rawType: string | undefined): 'danger' | 'warn' | 'accent' | undefined {
  const short = stripDefsPrefix(rawType ?? '');
  switch (short) {
    case 'modEventTakedown':
    case 'modEventMute':
    case 'modEventMuteReporter':
      return 'danger';
    case 'modEventEscalate':
    case 'modEventDivert':
    case 'modEventReport':
      return 'warn';
    case 'modEventLabel':
    case 'modEventTag':
    case 'modEventPriorityScore':
    case 'modEventReverseTakedown':
    case 'modEventResolveAppeal':
      return 'accent';
    default:
      return undefined;
  }
}

export function shortDid(did: string): string {
  if (did.length < 28) return did;
  return `${did.slice(0, 18)}…${did.slice(-4)}`;
}

const COLLECTION_LABELS: Record<string, string> = {
  'app.bsky.feed.post': 'post',
  'app.bsky.feed.repost': 'repost',
  'app.bsky.feed.like': 'like',
  'app.bsky.feed.generator': 'feed',
  'app.bsky.graph.list': 'list',
  'app.bsky.graph.starterpack': 'starter pack',
  'app.bsky.actor.profile': 'profile',
  'chat.bsky.actor.declaration': 'chat settings',
};

export function shortRkey(uri: string): string {
  const parts = uri.split('/');
  const rkey = parts[parts.length - 1] ?? '';
  const collection = parts[parts.length - 2] ?? '';
  const label = COLLECTION_LABELS[collection] ?? collection.split('.').pop() ?? collection;
  return `${rkey.slice(0, 10)}${rkey.length > 10 ? '…' : ''} (${label})`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  tabBarSpacer: { flex: 1 },
  tabButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: fontSize.base,
  },
  tabIndicator: {
    height: 2,
    width: '100%',
    marginTop: spacing.xs,
    borderRadius: 1,
  },
  toolButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  toolButtonLabel: {
    fontSize: fontSize.sm,
  },
  filterBar: {
    borderBottomWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filterSeparator: {
    width: 1,
    height: 16,
    backgroundColor: 'transparent',
    marginHorizontal: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: fontSize.xs,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  row: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  rowMain: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rowBodyCol: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  eventTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 0,
  },
  eventSubjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rowTitle: {
    flex: 1,
    fontSize: fontSize.base,
  },
  rowMeta: {
    fontSize: fontSize.sm,
  },
  rowMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  rowBody: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  rowActionsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  inlineActionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  inlineActionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: fontSize.xs,
  },
  placeholder: {
    fontSize: fontSize.base,
    padding: spacing.lg,
    opacity: opacity.secondary,
    textAlign: 'center',
  },
});
