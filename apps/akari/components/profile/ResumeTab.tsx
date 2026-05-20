import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { SifaEducationRecord, SifaPositionRecord, SifaSelfRecord } from '@/bluesky-api';
import { humanizeSifaToken } from '@/bluesky-api';
import { ProfileTabFlatList } from '@/components/profile/ProfileTabFlatList';
import { useProfileTabRefresh } from '@/components/profile/useProfileTabRefresh';
import { ThemedText } from '@/components/ThemedText';
import { fontSize, fontWeight, layout, radius, spacing } from '@/constants/tokens';
import {
  sortSifaEducation,
  sortSifaPositions,
  useSifaEducation,
  useSifaPositions,
  useSifaSelf,
} from '@/hooks/queries/useSifaProfile';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import type { ProfileTabContentProps } from '@/components/profile/types';

type ResumeTabProps = ProfileTabContentProps & {
  handle: string;
};

type Row =
  | { kind: 'self'; key: string; self: SifaSelfRecord }
  | { kind: 'positionsHeader'; key: string }
  | { kind: 'position'; key: string; position: SifaPositionRecord }
  | { kind: 'educationHeader'; key: string }
  | { kind: 'education'; key: string; education: SifaEducationRecord };

function formatDateRange(
  startedAt: string | undefined,
  endedAt: string | undefined,
  presentLabel: string,
): string {
  if (!startedAt && !endedAt) return '';
  const start = startedAt ?? '';
  const end = endedAt ?? presentLabel;
  if (!start) return end;
  return `${start} – ${end}`;
}

type SelfCardProps = {
  self: SifaSelfRecord;
  badgeBg: string;
  badgeText: string;
  secondary: string;
  borderColor: string;
  openToLabel: string;
  workplaceLabel: string;
};

function SelfCard({ self, badgeBg, badgeText, secondary, borderColor, openToLabel, workplaceLabel }: SelfCardProps) {
  const headline = self.value.headline;
  const about = self.value.about;
  const openTo = self.value.openTo ?? [];
  const workplace = self.value.preferredWorkplace ?? [];

  return (
    <View style={[styles.selfCard, { borderColor }]}>
      {headline ? <ThemedText style={styles.headline}>{headline}</ThemedText> : null}
      {about ? (
        <ThemedText style={[styles.aboutText, { color: secondary }]}>{about}</ThemedText>
      ) : null}
      {openTo.length > 0 ? (
        <View style={styles.tagGroup}>
          <ThemedText style={[styles.tagGroupLabel, { color: secondary }]}>{openToLabel}</ThemedText>
          <View style={styles.tagRow}>
            {openTo.map((token) => (
              <View key={token} style={[styles.tag, { backgroundColor: badgeBg }]}>
                <ThemedText style={[styles.tagText, { color: badgeText }]}>
                  {humanizeSifaToken(token)}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      {workplace.length > 0 ? (
        <View style={styles.tagGroup}>
          <ThemedText style={[styles.tagGroupLabel, { color: secondary }]}>{workplaceLabel}</ThemedText>
          <View style={styles.tagRow}>
            {workplace.map((token) => (
              <View key={token} style={[styles.tag, { backgroundColor: badgeBg }]}>
                <ThemedText style={[styles.tagText, { color: badgeText }]}>
                  {humanizeSifaToken(token)}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

type PositionCardProps = {
  position: SifaPositionRecord;
  presentLabel: string;
  badgeBg: string;
  badgeText: string;
  secondary: string;
  borderColor: string;
};

function PositionCard({ position, presentLabel, badgeBg, badgeText, secondary, borderColor }: PositionCardProps) {
  const v = position.value;
  const range = formatDateRange(v.startedAt, v.endedAt, presentLabel);
  return (
    <View style={[styles.entryCard, { borderColor }]}>
      <View style={styles.entryHeader}>
        <ThemedText style={styles.entryTitle}>{v.title}</ThemedText>
        {v.employmentType ? (
          <View style={[styles.tag, { backgroundColor: badgeBg }]}>
            <ThemedText style={[styles.tagText, { color: badgeText }]}>
              {humanizeSifaToken(v.employmentType)}
            </ThemedText>
          </View>
        ) : null}
      </View>
      <ThemedText style={[styles.entrySubtitle, { color: secondary }]}>{v.company}</ThemedText>
      {range ? (
        <ThemedText style={[styles.entryMeta, { color: secondary }]}>{range}</ThemedText>
      ) : null}
      {v.description ? (
        <ThemedText style={[styles.entryBody, { color: secondary }]}>{v.description}</ThemedText>
      ) : null}
    </View>
  );
}

type EducationCardProps = {
  education: SifaEducationRecord;
  presentLabel: string;
  secondary: string;
  borderColor: string;
};

function EducationCard({ education, presentLabel, secondary, borderColor }: EducationCardProps) {
  const v = education.value;
  const range = formatDateRange(v.startedAt, v.endedAt, presentLabel);
  const degreeLine = [v.degree, v.fieldOfStudy].filter(Boolean).join(', ');
  return (
    <View style={[styles.entryCard, { borderColor }]}>
      <ThemedText style={styles.entryTitle}>{v.institution}</ThemedText>
      {degreeLine ? (
        <ThemedText style={[styles.entrySubtitle, { color: secondary }]}>{degreeLine}</ThemedText>
      ) : null}
      {v.grade ? (
        <ThemedText style={[styles.entryMeta, { color: secondary }]}>{v.grade}</ThemedText>
      ) : null}
      {range ? (
        <ThemedText style={[styles.entryMeta, { color: secondary }]}>{range}</ThemedText>
      ) : null}
      {v.description ? (
        <ThemedText style={[styles.entryBody, { color: secondary }]}>{v.description}</ThemedText>
      ) : null}
    </View>
  );
}

export function ResumeTab({
  handle,
  ListHeaderComponent,
  StickyTabComponent,
  pinScrollY,
  isActive,
  onProfileRefresh,
  onScrollY,
  onHeaderHeightChange,
}: ResumeTabProps) {
  const { t } = useTranslation();
  const borderColor = useBorderColor();
  const secondary = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const sectionHeaderColor = useThemeColor({ light: '#374151', dark: '#D1D5DB' }, 'text');
  const badgeBg = useThemeColor({ light: '#EEF2FF', dark: '#1F2937' }, 'background');
  const badgeText = useThemeColor({ light: '#4338CA', dark: '#A5B4FC' }, 'text');

  const { data: self, isLoading: isSelfLoading, refetch: refetchSelf, isRefetching: isSelfRefetching } = useSifaSelf(handle);
  const {
    data: positions,
    isLoading: isPositionsLoading,
    fetchNextPage: fetchMorePositions,
    hasNextPage: hasMorePositions,
    isFetchingNextPage: isFetchingMorePositions,
    refetch: refetchPositions,
    isRefetching: isPositionsRefetching,
  } = useSifaPositions(handle);
  const {
    data: education,
    isLoading: isEducationLoading,
    fetchNextPage: fetchMoreEducation,
    hasNextPage: hasMoreEducation,
    isFetchingNextPage: isFetchingMoreEducation,
    refetch: refetchEducation,
    isRefetching: isEducationRefetching,
  } = useSifaEducation(handle);

  const refetchAll = useCallback(async () => {
    await Promise.all([refetchSelf(), refetchPositions(), refetchEducation()]);
  }, [refetchSelf, refetchPositions, refetchEducation]);
  const handleRefresh = useProfileTabRefresh(refetchAll, onProfileRefresh);

  const sortedPositions = useMemo(() => sortSifaPositions(positions), [positions]);
  const sortedEducation = useMemo(() => sortSifaEducation(education), [education]);

  const isLoading = isSelfLoading || isPositionsLoading || isEducationLoading;
  const isRefetching = isSelfRefetching || isPositionsRefetching || isEducationRefetching;
  const hasNextPage = hasMorePositions || hasMoreEducation;
  const isFetchingNextPage = isFetchingMorePositions || isFetchingMoreEducation;

  const fetchNextPage = useCallback(() => {
    if (hasMorePositions) fetchMorePositions();
    if (hasMoreEducation) fetchMoreEducation();
  }, [hasMorePositions, hasMoreEducation, fetchMorePositions, fetchMoreEducation]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    if (self) out.push({ kind: 'self', key: 'sifa:self', self });
    if (sortedPositions.length > 0) {
      out.push({ kind: 'positionsHeader', key: 'sifa:positions:header' });
      for (const position of sortedPositions) {
        out.push({ kind: 'position', key: position.uri, position });
      }
    }
    if (sortedEducation.length > 0) {
      out.push({ kind: 'educationHeader', key: 'sifa:education:header' });
      for (const item of sortedEducation) {
        out.push({ kind: 'education', key: item.uri, education: item });
      }
    }
    return out;
  }, [self, sortedPositions, sortedEducation]);

  const presentLabel = t('profile.resumePresent');
  const positionsHeaderLabel = t('profile.resumePositions');
  const educationHeaderLabel = t('profile.resumeEducation');
  const openToLabel = t('profile.resumeOpenTo');
  const workplaceLabel = t('profile.resumeWorkplace');

  const renderItem = useCallback(
    (row: Row) => {
      switch (row.kind) {
        case 'self':
          return (
            <SelfCard
              self={row.self}
              badgeBg={badgeBg}
              badgeText={badgeText}
              secondary={secondary}
              borderColor={borderColor}
              openToLabel={openToLabel}
              workplaceLabel={workplaceLabel}
            />
          );
        case 'positionsHeader':
          return (
            <View style={[styles.sectionHeader, { borderColor }]}>
              <ThemedText style={[styles.sectionHeaderText, { color: sectionHeaderColor }]}>
                {positionsHeaderLabel}
              </ThemedText>
            </View>
          );
        case 'position':
          return (
            <PositionCard
              position={row.position}
              presentLabel={presentLabel}
              badgeBg={badgeBg}
              badgeText={badgeText}
              secondary={secondary}
              borderColor={borderColor}
            />
          );
        case 'educationHeader':
          return (
            <View style={[styles.sectionHeader, { borderColor }]}>
              <ThemedText style={[styles.sectionHeaderText, { color: sectionHeaderColor }]}>
                {educationHeaderLabel}
              </ThemedText>
            </View>
          );
        case 'education':
          return (
            <EducationCard
              education={row.education}
              presentLabel={presentLabel}
              secondary={secondary}
              borderColor={borderColor}
            />
          );
        default:
          return null;
      }
    },
    [
      badgeBg,
      badgeText,
      borderColor,
      educationHeaderLabel,
      openToLabel,
      positionsHeaderLabel,
      presentLabel,
      secondary,
      sectionHeaderColor,
      workplaceLabel,
    ],
  );

  return (
    <ProfileTabFlatList
      data={rows}
      renderItem={renderItem}
      keyExtractor={(row: Row) => row.key}
      isLoading={isLoading}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
      ListHeaderComponent={ListHeaderComponent}
      StickyTabComponent={StickyTabComponent}
      emptyText={t('profile.noResume')}
      pinScrollY={pinScrollY}
      isActive={isActive}
      onRefresh={handleRefresh}
      refreshing={isRefetching}
      onScrollY={onScrollY}
      onHeaderHeightChange={onHeaderHeightChange}
    />
  );
}

const styles = StyleSheet.create({
  selfCard: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderLeftWidth: layout.hairline,
    borderRightWidth: layout.hairline,
    borderBottomWidth: layout.hairline,
    gap: spacing.sm,
  },
  headline: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  aboutText: {
    fontSize: fontSize.base,
    lineHeight: 22,
  },
  tagGroup: {
    gap: spacing.xs,
  },
  tagGroupLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
  },
  tagText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderLeftWidth: layout.hairline,
    borderRightWidth: layout.hairline,
  },
  sectionHeaderText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  entryCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderLeftWidth: layout.hairline,
    borderRightWidth: layout.hairline,
    borderBottomWidth: layout.hairline,
    gap: spacing.xs,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  entryTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    flexShrink: 1,
  },
  entrySubtitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  entryMeta: {
    fontSize: fontSize.xs,
  },
  entryBody: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
});
