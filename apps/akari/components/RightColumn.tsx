import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Image } from '@/components/Image';
import { ProfileHoverTrigger } from '@/components/ProfileHoverCard';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { fontSize, fontWeight, radius, shadows, spacing, zIndex } from '@/constants/tokens';
import { useFollowUser } from '@/hooks/mutations/useFollowUser';
import { useSuggestedFollows } from '@/hooks/queries/useSuggestedFollows';
import { useTrendingTopics } from '@/hooks/queries/useTrendingTopics';
import { useTypeaheadActors, type TypeaheadActor } from '@/hooks/queries/useTypeaheadActors';
import { useFeedSettings } from '@/hooks/useFeedSettings';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { useNavigateToFeed } from '@/utils/navigation';

const RIGHT_COLUMN_WIDTH = 320;
const TRENDING_LINK_PATTERN = /^\/profile\/([^/]+)\/feed\/([^/?#]+)/;

export function RightColumn() {
  const panelColor = useThemeColor({}, 'panel');
  const lineSoft = useThemeColor({}, 'lineSoft');
  const textPrimary = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textTertiary = useThemeColor({}, 'textTertiary');
  const accentColor = useThemeColor({}, 'tint');
  const hoverBg = useThemeColor({}, 'hover');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <SearchBox
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        textTertiary={textTertiary}
        panelColor={panelColor}
        lineSoft={lineSoft}
        accentColor={accentColor}
        hoverBg={hoverBg}
      />
      <TrendingCard
        panelColor={panelColor}
        lineSoft={lineSoft}
        textPrimary={textPrimary}
        textTertiary={textTertiary}
        hoverBg={hoverBg}
      />
      <WhoToFollowCard
        panelColor={panelColor}
        lineSoft={lineSoft}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        accentColor={accentColor}
        hoverBg={hoverBg}
      />
    </ScrollView>
  );
}

type SearchBoxProps = {
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  panelColor: string;
  lineSoft: string;
  accentColor: string;
  hoverBg: string;
};

const SearchBox = React.memo(function SearchBox({
  textPrimary,
  textSecondary,
  textTertiary,
  panelColor,
  lineSoft,
  accentColor,
  hoverBg,
}: SearchBoxProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const { data: suggestions } = useTypeaheadActors(query);

  const handleSubmit = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push({
      pathname: '/(tabs)/search',
      params: { query: trimmed },
    });
  }, [query]);

  const handleSelectActor = useCallback((actor: TypeaheadActor) => {
    setQuery('');
    setFocused(false);
    const href =
      Platform.OS === 'web' ? `/profile/${actor.handle}` : `/(tabs)/profile/${actor.handle}`;
    router.push(href as never);
  }, []);

  const showDropdown = focused && suggestions.length > 0;

  return (
    <View style={styles.searchContainer}>
      <View style={[styles.searchWrapper, { backgroundColor: panelColor }]}>
        <IconSymbol name="magnifyingglass" size={16} color={textTertiary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSubmit}
          onFocus={() => setFocused(true)}
          // Delay so a typeahead row press registers before we hide the
          // dropdown — RN's onBlur fires before onPress on the touched row.
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder={t('common.search')}
          placeholderTextColor={textTertiary}
          returnKeyType="search"
          style={[styles.searchInput, { color: textPrimary }]}
        />
      </View>
      {showDropdown ? (
        <View
          style={[
            styles.typeaheadDropdown,
            { backgroundColor: panelColor, borderColor: lineSoft },
            shadows.md,
          ]}
        >
          {suggestions.map((actor) => (
            <TypeaheadRow
              key={actor.did}
              actor={actor}
              onPress={() => handleSelectActor(actor)}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              accentColor={accentColor}
              hoverBg={hoverBg}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
});

type TypeaheadRowProps = {
  actor: TypeaheadActor;
  onPress: () => void;
  textPrimary: string;
  textSecondary: string;
  accentColor: string;
  hoverBg: string;
};

const TypeaheadRow = React.memo(function TypeaheadRow({
  actor,
  onPress,
  textPrimary,
  textSecondary,
  accentColor,
  hoverBg,
}: TypeaheadRowProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={[styles.typeaheadRow, hovered && { backgroundColor: hoverBg }]}
    >
      <View style={[styles.typeaheadAvatar, { backgroundColor: accentColor }]}>
        {actor.avatar ? (
          <Image
            source={{ uri: actor.avatar }}
            style={styles.avatarImage}
            contentFit="cover"
          />
        ) : (
          <ThemedText style={styles.typeaheadAvatarInitial}>
            {(actor.displayName || actor.handle).charAt(0).toUpperCase()}
          </ThemedText>
        )}
      </View>
      <View style={styles.typeaheadBody}>
        <ThemedText
          style={[styles.suggestedName, { color: textPrimary }]}
          numberOfLines={1}
        >
          {actor.displayName ?? actor.handle}
        </ThemedText>
        <ThemedText
          style={[styles.suggestedHandle, { color: textSecondary }]}
          numberOfLines={1}
        >
          @{actor.handle}
        </ThemedText>
      </View>
    </Pressable>
  );
});

type TrendingCardProps = {
  panelColor: string;
  lineSoft: string;
  textPrimary: string;
  textTertiary: string;
  hoverBg: string;
};

const TrendingCard = React.memo(function TrendingCard({
  panelColor,
  lineSoft,
  textPrimary,
  textTertiary,
  hoverBg,
}: TrendingCardProps) {
  const { t } = useTranslation();
  const { trendingBarEnabled } = useFeedSettings();
  const { data: topics } = useTrendingTopics(8, trendingBarEnabled);
  const navigateToFeed = useNavigateToFeed();

  const handlePress = useCallback(
    (topic: { topic: string; link: string }) => {
      const match = TRENDING_LINK_PATTERN.exec(topic.link);
      if (match) {
        const [, handleOrDid, rkey] = match;
        navigateToFeed({ actor: handleOrDid, rKey: rkey });
        return;
      }
      router.push({
        pathname: '/(tabs)/search',
        params: { query: topic.topic },
      });
    },
    [navigateToFeed],
  );

  if (!trendingBarEnabled) return null;
  if (!topics || topics.length === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: panelColor, borderColor: lineSoft }]}>
      <ThemedText style={[styles.cardTitle, { color: textPrimary }]}>
        {t('feed.trending')}
      </ThemedText>
      {topics.map((topic, index) => (
        <TrendingRow
          key={topic.link}
          rank={index + 1}
          topic={topic.topic}
          onPress={() => handlePress(topic)}
          textPrimary={textPrimary}
          textTertiary={textTertiary}
          hoverBg={hoverBg}
        />
      ))}
    </View>
  );
});

type TrendingRowProps = {
  rank: number;
  topic: string;
  onPress: () => void;
  textPrimary: string;
  textTertiary: string;
  hoverBg: string;
};

const TrendingRow = React.memo(function TrendingRow({
  rank,
  topic,
  onPress,
  textPrimary,
  textTertiary,
  hoverBg,
}: TrendingRowProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={[styles.row, hovered && { backgroundColor: hoverBg }]}
    >
      <ThemedText style={[styles.trendingRank, { color: textTertiary }]}>
        {rank}
      </ThemedText>
      <View style={styles.trendingBody}>
        <ThemedText style={[styles.trendingTopic, { color: textPrimary }]} numberOfLines={1}>
          {topic}
        </ThemedText>
      </View>
    </Pressable>
  );
});

type WhoToFollowCardProps = {
  panelColor: string;
  lineSoft: string;
  textPrimary: string;
  textSecondary: string;
  accentColor: string;
  hoverBg: string;
};

const WhoToFollowCard = React.memo(function WhoToFollowCard({
  panelColor,
  lineSoft,
  textPrimary,
  textSecondary,
  accentColor,
  hoverBg,
}: WhoToFollowCardProps) {
  const { t } = useTranslation();
  const { data: actors, isLoading } = useSuggestedFollows(5);

  if (isLoading || !actors || actors.length === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: panelColor, borderColor: lineSoft }]}>
      <ThemedText style={[styles.cardTitle, { color: textPrimary }]}>
        {t('feed.whoToFollow')}
      </ThemedText>
      {actors.map((actor) => (
        <SuggestedRow
          key={actor.did}
          did={actor.did}
          handle={actor.handle}
          displayName={actor.displayName ?? actor.handle}
          avatar={actor.avatar}
          followingUri={actor.viewer?.following}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          accentColor={accentColor}
          hoverBg={hoverBg}
        />
      ))}
    </View>
  );
});

type SuggestedRowProps = {
  did: string;
  handle: string;
  displayName: string;
  avatar?: string;
  followingUri?: string;
  textPrimary: string;
  textSecondary: string;
  accentColor: string;
  hoverBg: string;
};

const SuggestedRow = React.memo(function SuggestedRow({
  did,
  handle,
  displayName,
  avatar,
  followingUri,
  textPrimary,
  textSecondary,
  accentColor,
  hoverBg,
}: SuggestedRowProps) {
  const [hovered, setHovered] = useState(false);

  const handlePress = useCallback(() => {
    const href =
      Platform.OS === 'web' ? `/profile/${handle}` : `/(tabs)/profile/${handle}`;
    router.push(href as never);
  }, [handle]);

  return (
    <ProfileHoverTrigger handle={handle}>
    <Pressable
      onPress={handlePress}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={[styles.row, hovered && { backgroundColor: hoverBg }]}
    >
      <View style={[styles.avatar, { backgroundColor: accentColor }]}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatarImage} contentFit="cover" />
        ) : (
          <ThemedText style={styles.avatarInitial}>
            {(displayName || handle).charAt(0).toUpperCase()}
          </ThemedText>
        )}
      </View>
      <View style={styles.suggestedBody}>
        <ThemedText style={[styles.suggestedName, { color: textPrimary }]} numberOfLines={1}>
          {displayName}
        </ThemedText>
        <ThemedText style={[styles.suggestedHandle, { color: textSecondary }]} numberOfLines={1}>
          @{handle}
        </ThemedText>
      </View>
      <FollowButton did={did} followingUri={followingUri} accentColor={accentColor} />
    </Pressable>
    </ProfileHoverTrigger>
  );
});

type FollowButtonProps = {
  did: string;
  followingUri?: string;
  accentColor: string;
};

const FollowButton = React.memo(function FollowButton({
  did,
  followingUri,
  accentColor,
}: FollowButtonProps) {
  const { t } = useTranslation();
  // oxlint-disable-next-line react-doctor/no-derived-useState -- optimistic follow state diverges from the prop during the mutation, rolling back on error
  const [optimisticUri, setOptimisticUri] = useState<string | undefined>(followingUri);
  const followMutation = useFollowUser();
  const isFollowing = Boolean(optimisticUri);

  const handlePress = useCallback(
    (e: { stopPropagation?: () => void }) => {
      e.stopPropagation?.();
      if (isFollowing && optimisticUri) {
        const prev = optimisticUri;
        setOptimisticUri(undefined);
        followMutation.mutate(
          { did, followUri: prev, action: 'unfollow' },
          {
            onError: () => setOptimisticUri(prev),
          },
        );
      } else {
        // Optimistically flip; rollback on error. The follow mutation returns
        // the new record URI but we don't pipe it back here — the next
        // refresh of useSuggestedFollows will carry it.
        setOptimisticUri('pending');
        followMutation.mutate(
          { did, action: 'follow' },
          {
            onError: () => setOptimisticUri(undefined),
          },
        );
      }
    },
    [did, isFollowing, optimisticUri, followMutation],
  );

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      style={[
        styles.followButton,
        isFollowing
          ? { borderColor: accentColor, backgroundColor: 'transparent' }
          : { backgroundColor: accentColor, borderColor: accentColor },
      ]}
      accessibilityRole="button"
      accessibilityLabel={isFollowing ? t('common.following') : t('common.follow')}
    >
      <ThemedText
        style={[
          styles.followButtonText,
          { color: isFollowing ? accentColor : '#ffffff' },
        ]}
      >
        {isFollowing ? t('common.following') : t('common.follow')}
      </ThemedText>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    width: RIGHT_COLUMN_WIDTH,
    flexShrink: 0,
  },
  content: {
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  searchContainer: {
    position: 'relative',
    zIndex: zIndex.dropdown,
  } as object,
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
  } as object,
  typeaheadDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: spacing.xs,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.xs,
    overflow: 'hidden',
    zIndex: zIndex.dropdown,
  } as object,
  typeaheadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  typeaheadAvatar: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  typeaheadAvatarInitial: {
    color: '#ffffff',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  typeaheadBody: {
    flex: 1,
  },
  card: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  trendingRank: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    width: 20,
  },
  trendingBody: {
    flex: 1,
  },
  trendingTopic: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  suggestedBody: {
    flex: 1,
  },
  suggestedName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  suggestedHandle: {
    fontSize: fontSize.sm,
    marginTop: 1,
  },
  followButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  followButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
