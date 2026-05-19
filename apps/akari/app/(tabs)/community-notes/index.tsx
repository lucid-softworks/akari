import { Stack } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { AddCommunityNoteModal } from '@/components/post/CommunityNoteContributor';
import { useDialogManager } from '@/contexts/DialogContext';
import { CommunityNote } from '@/components/post/CommunityNote';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { fontSize, fontWeight, opacity, radius, spacing } from '@/constants/tokens';
import { webColumnSideBorders, webScreenContainer } from '@/constants/webStyles';
import { useCommunityNotesSettings } from '@/hooks/useCommunityNotesSettings';
import {
  useMyContributorProfile,
  useNotesPendingRating,
  usePendingPostsNeedingNotes,
} from '@/hooks/queries/useCommunityNotesContributor';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { formatRelativeTime } from '@/utils/timeUtils';

type Tab = 'pending' | 'rate' | 'profile';

/**
 * Contributor portal for Community Notes. Three tabs:
 *   - Pending: posts readers have flagged for context.
 *   - Rate: notes other contributors have written, awaiting your rating.
 *   - You: your contributor profile + recent notes you've authored.
 *
 * Gated behind the contributor opt-in (`useCommunityNotesSettings`).
 * Non-contributors see an enrollment card instead of the tabs.
 */
export default function CommunityNotesScreen() {
  const borderColor = useBorderColor();
  const secondary = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const accent = useThemeColor({}, 'tint');
  const { t } = useTranslation();

  const { isContributor, setIsContributor } = useCommunityNotesSettings();
  const [tab, setTab] = useState<Tab>('pending');

  if (!isContributor) {
    return (
      <ThemedView style={Platform.OS === 'web' ? webScreenContainer : styles.container}>
        <Stack.Screen options={{ title: t('communityNotes.title') }} />
        <View
          style={[
            styles.enrollCard,
            { borderColor },
            webColumnSideBorders(borderColor),
          ]}
        >
          <ThemedText style={styles.enrollTitle}>{t('communityNotes.enroll.title')}</ThemedText>
          <ThemedText style={[styles.enrollBody, { color: secondary }]}>
            {t('communityNotes.enroll.body1')}
          </ThemedText>
          <ThemedText style={[styles.enrollBody, { color: secondary }]}>
            {t('communityNotes.enroll.body2')}
          </ThemedText>
          <Pressable
            onPress={() => setIsContributor(true)}
            style={({ pressed }) => [
              styles.enrollButton,
              { backgroundColor: accent },
              pressed && { opacity: 0.7 },
            ]}
          >
            <ThemedText style={styles.enrollButtonLabel}>{t('communityNotes.enroll.cta')}</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={Platform.OS === 'web' ? webScreenContainer : styles.container}>
      <Stack.Screen options={{ title: t('communityNotes.title') }} />

      <View
        style={[
          styles.tabBar,
          { borderBottomColor: borderColor },
          webColumnSideBorders(borderColor),
        ]}
      >
        <TabButton label={t('communityNotes.tabs.pending')} active={tab === 'pending'} onPress={() => setTab('pending')} accent={accent} secondary={secondary} />
        <TabButton label={t('communityNotes.tabs.rate')} active={tab === 'rate'} onPress={() => setTab('rate')} accent={accent} secondary={secondary} />
        <TabButton label={t('communityNotes.tabs.you')} active={tab === 'profile'} onPress={() => setTab('profile')} accent={accent} secondary={secondary} />
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {tab === 'pending' ? (
          <PendingTab borderColor={borderColor} secondary={secondary} accent={accent} />
        ) : tab === 'rate' ? (
          <RateTab borderColor={borderColor} secondary={secondary} />
        ) : (
          <ProfileTab
            borderColor={borderColor}
            secondary={secondary}
            accent={accent}
            onLeave={() => setIsContributor(false)}
          />
        )}
      </ScrollView>
    </ThemedView>
  );
}

function TabButton({
  label,
  active,
  onPress,
  accent,
  secondary,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  accent: string;
  secondary: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tabButton, pressed && { opacity: 0.6 }]}
    >
      <ThemedText
        style={[
          styles.tabLabel,
          active ? { color: accent, fontWeight: fontWeight.semibold } : { color: secondary },
        ]}
      >
        {label}
      </ThemedText>
      <View style={[styles.tabIndicator, active ? { backgroundColor: accent } : null]} />
    </Pressable>
  );
}

function PendingTab({
  borderColor,
  secondary,
  accent,
}: {
  borderColor: string;
  secondary: string;
  accent: string;
}) {
  const { data: pending } = usePendingPostsNeedingNotes();
  const dialogManager = useDialogManager();
  const { t } = useTranslation();
  const openComposer = useCallback(
    (postUri: string) => {
      const id = 'add-community-note';
      dialogManager.open({
        id,
        component: (
          <AddCommunityNoteModal onClose={() => dialogManager.close(id)} postUri={postUri} />
        ),
      });
    },
    [dialogManager],
  );

  if (!pending || pending.length === 0) {
    return (
      <ThemedText style={[styles.placeholder, { color: secondary }]}>
        {t('communityNotes.pendingTab.empty')}
      </ThemedText>
    );
  }

  return (
    <View>
      {pending.map((post) => (
        <View
          key={post.uri}
          style={[styles.row, { borderBottomColor: borderColor }, webColumnSideBorders(borderColor)]}
        >
          <ThemedText style={styles.rowTitle} numberOfLines={1}>
            {post.authorDisplayName ?? `@${post.authorHandle}`}
          </ThemedText>
          <ThemedText style={[styles.rowHandle, { color: secondary }]} numberOfLines={1}>
            @{post.authorHandle}
          </ThemedText>
          <ThemedText style={styles.rowBody} numberOfLines={4}>
            {post.text}
          </ThemedText>
          <View style={styles.rowMetaRow}>
            <ThemedText style={[styles.rowMeta, { color: secondary }]}>
              {t('communityNotes.pendingTab.requestCountAndTime', {
                count: post.requestCount,
                time: formatRelativeTime(post.lastRequestedAt),
              })}
            </ThemedText>
            <Pressable
              onPress={() => openComposer(post.uri)}
              style={({ pressed }) => [
                styles.actionButton,
                { borderColor: accent },
                pressed && { opacity: 0.7 },
              ]}
            >
              <ThemedText style={[styles.actionLabel, { color: accent }]}>{t('communityNotes.pendingTab.writeNote')}</ThemedText>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

function RateTab({ borderColor, secondary }: { borderColor: string; secondary: string }) {
  const { data: notes } = useNotesPendingRating();
  const { t } = useTranslation();
  if (!notes || notes.length === 0) {
    return (
      <ThemedText style={[styles.placeholder, { color: secondary }]}>
        {t('communityNotes.rateTab.empty')}
      </ThemedText>
    );
  }
  return (
    <View>
      {notes.map((note) => (
        <View
          key={note.id}
          style={[styles.rateCell, webColumnSideBorders(borderColor)]}
        >
          <ThemedText style={[styles.rateContext, { color: secondary }]} numberOfLines={1}>
            {t('communityNotes.rateTab.onPost', { postId: note.postUri.split('/').pop() ?? '' })}
          </ThemedText>
          <CommunityNote note={note} />
        </View>
      ))}
    </View>
  );
}

function ProfileTab({
  borderColor,
  secondary,
  accent,
  onLeave,
}: {
  borderColor: string;
  secondary: string;
  accent: string;
  onLeave: () => void;
}) {
  const { data: profile } = useMyContributorProfile();
  const { t } = useTranslation();
  if (!profile) return null;
  return (
    <View>
      <View
        style={[
          styles.statsCard,
          { borderColor },
          webColumnSideBorders(borderColor),
        ]}
      >
        <View style={styles.statsRow}>
          <Stat value={profile.notesWritten} label={t('communityNotes.profile.notesWritten')} secondary={secondary} />
          <Stat value={`${profile.helpfulRate}%`} label={t('communityNotes.profile.helpfulRate')} secondary={secondary} />
          <Stat value={profile.ratingsGiven} label={t('communityNotes.profile.ratingsGiven')} secondary={secondary} />
        </View>
        <ThemedText style={[styles.joined, { color: secondary }]}>
          {t('communityNotes.profile.contributorSince', { date: new Date(profile.joinedAt).toLocaleDateString() })}
        </ThemedText>
        <View style={styles.profileButtonRow}>
          <Pressable
            onPress={onLeave}
            style={({ pressed }) => [
              styles.actionButton,
              { borderColor },
              pressed && { opacity: 0.7 },
            ]}
          >
            <ThemedText style={[styles.actionLabel, { color: secondary }]}>
              {t('communityNotes.profile.leave')}
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <ContributorPreferences accent={accent} borderColor={borderColor} secondary={secondary} />

      <ThemedText style={[styles.sectionLabel, { color: secondary }]}>{t('communityNotes.profile.recentNotes')}</ThemedText>
      {profile.recentNotes.length === 0 ? (
        <ThemedText style={[styles.placeholder, { color: secondary }]}>
          {t('communityNotes.profile.noNotes')}
        </ThemedText>
      ) : (
        profile.recentNotes.map((note) => (
          <View key={note.id} style={[styles.rateCell, webColumnSideBorders(borderColor)]}>
            <ThemedText style={[styles.rateContext, { color: secondary }]} numberOfLines={1}>
              {t('communityNotes.rateTab.onPost', { postId: note.postUri.split('/').pop() ?? '' })}
            </ThemedText>
            <CommunityNote note={note} />
          </View>
        ))
      )}
    </View>
  );
}

function Stat({ value, label, secondary }: { value: string | number; label: string; secondary: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText style={styles.statValue}>{String(value)}</ThemedText>
      <ThemedText style={[styles.statLabel, { color: secondary }]}>{label}</ThemedText>
    </View>
  );
}

function ContributorPreferences({
  accent,
  borderColor,
  secondary,
}: {
  accent: string;
  borderColor: string;
  secondary: string;
}) {
  // Local state placeholder for "show my notes publicly" — once a real
  // contributor lexicon ships this maps to a setting record write.
  const [showPublicly, setShowPublicly] = useState(true);
  const { t } = useTranslation();
  return (
    <View
      style={[
        styles.prefCard,
        { borderColor },
        webColumnSideBorders(borderColor),
      ]}
    >
      <View style={styles.prefRow}>
        <View style={styles.prefBody}>
          <ThemedText style={styles.prefTitle}>{t('communityNotes.profile.showPubliclyTitle')}</ThemedText>
          <ThemedText style={[styles.prefHint, { color: secondary }]}>
            {t('communityNotes.profile.showPubliclyHint')}
          </ThemedText>
        </View>
        <Switch value={showPublicly} onValueChange={setShowPublicly} trackColor={{ true: accent }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
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
  listContent: {
    paddingBottom: spacing.xxl,
  },
  row: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.xs,
  },
  rowTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  rowHandle: {
    fontSize: fontSize.sm,
  },
  rowBody: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  rowMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  rowMeta: {
    fontSize: fontSize.xs,
  },
  actionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  actionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  rateCell: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  rateContext: {
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  enrollCard: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  enrollTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
  },
  enrollBody: {
    fontSize: fontSize.base,
    lineHeight: 22,
  },
  enrollButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  enrollButtonLabel: {
    color: '#ffffff',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  statsCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  stat: {
    flex: 1,
    gap: 2,
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  joined: {
    fontSize: fontSize.sm,
    opacity: opacity.secondary,
  },
  profileButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  prefCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  prefBody: {
    flex: 1,
    gap: 2,
  },
  prefTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  prefHint: {
    fontSize: fontSize.sm,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  placeholder: {
    padding: spacing.lg,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
});
