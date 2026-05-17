import { Image } from '@/components/Image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { VerificationBadge } from '@/components/VerificationBadge';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, radius, fontSize, fontWeight, layout, activeOpacity, opacity } from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useStartConvo } from '@/hooks/mutations/useStartConvo';
import { useSearch } from '@/hooks/queries/useSearch';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { isFeatureEnabled } from '@/utils/featureFlags';
import type { BlueskyProfile } from '@/bluesky-api';

// Bluesky's chat service currently only allows group convos for the bsky
// team's accounts; everyone else hits an error past one peer. Cap the
// picker accordingly until the `groupChats` feature flag flips.
const MAX_MEMBERS = isFeatureEnabled('groupChats') ? 10 : 1;

export default function NewChatScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { initialMember } = useLocalSearchParams<{ initialMember?: string }>();

  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [selected, setSelected] = useState<BlueskyProfile[]>([]);

  const startConvo = useStartConvo();

  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'text');
  const textColor = useThemeColor({}, 'text');
  const inputBg = useThemeColor({ light: '#f5f5f5', dark: '#1f2123' }, 'background');
  const tintColor = useThemeColor({}, 'tint');

  const { data: searchData, isLoading } = useSearch(submittedQuery.trim() || undefined, 'users', 20, 'top');
  const profiles = useMemo(() => {
    const all = searchData?.pages.flatMap((p) => p.results) ?? [];
    const selectedDids = new Set(selected.map((s) => s.did));
    const result: BlueskyProfile[] = [];
    for (const r of all) {
      if (r.type !== 'profile') continue;
      const profile = r.data as BlueskyProfile;
      if (selectedDids.has(profile.did)) continue;
      result.push(profile);
    }
    return result;
  }, [searchData, selected]);

  // Debounce the query into submittedQuery so the search fires as the user
  // types instead of only on Enter.
  useEffect(() => {
    const t = setTimeout(() => setSubmittedQuery(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  const handleAddMember = useCallback(
    (profile: BlueskyProfile) => {
      if (selected.length >= MAX_MEMBERS) return;
      setSelected((prev) => [...prev, profile]);
      // Clear input and search to encourage adding more.
      setQuery('');
      setSubmittedQuery('');
    },
    [selected.length],
  );

  const handleRemoveMember = useCallback((did: string) => {
    setSelected((prev) => prev.filter((p) => p.did !== did));
  }, []);

  const handleStart = useCallback(() => {
    if (selected.length === 0) return;
    startConvo.mutate(
      { memberDids: selected.map((s) => s.did) },
      {
        onSuccess: (convo) => {
          // Route by convoId. Pass handle as a hint so the chat screen can
          // still resolve from the conversations list when the convoId hasn't
          // been cached yet (immediately after creation).
          const firstHandle = selected[0].handle;
          router.replace(
            `/(tabs)/messages/${encodeURIComponent(convo.id)}?handle=${encodeURIComponent(firstHandle)}` as any,
          );
        },
        onError: () => {
          showToast({ message: t('common.error'), type: 'error' });
        },
      },
    );
  }, [selected, startConvo, showToast, t]);

  // Pre-seed with a member if the screen was opened from a profile.
  useMemo(() => {
    if (initialMember && selected.length === 0) {
      // We only have a handle/DID string, not a full profile. The user can
      // search again to confirm — for now just stash a minimal placeholder.
      // (Full implementation in stage 2 once we wire DID→profile lookups.)
    }
  }, [initialMember, selected.length]);

  const canStart = selected.length > 0 && !startConvo.isPending;

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => pressed && { opacity: 0.7 }}>
          <ThemedText style={[styles.headerAction, { color: iconColor }]}>{t('common.cancel')}</ThemedText>
        </Pressable>
        <ThemedText style={[styles.title, { color: textColor }]}>
          {t('messages.newChat')}
        </ThemedText>
        <Pressable onPress={handleStart} disabled={!canStart} hitSlop={12} style={({ pressed }) => pressed && { opacity: 0.7 }}>
          {startConvo.isPending ? (
            <ActivityIndicator size="small" />
          ) : (
            <ThemedText
              style={[
                styles.headerAction,
                { color: canStart ? tintColor : iconColor, fontWeight: fontWeight.semibold },
              ]}
            >
              {t('messages.start')}
            </ThemedText>
          )}
        </Pressable>
      </View>

      {selected.length > 0 ? (
        <View style={[styles.chipsRow, { borderBottomColor: borderColor }]}>
          {selected.map((profile) => (
            <Pressable
              key={profile.did}
              onPress={() => handleRemoveMember(profile.did)}
              style={({ pressed }) => [styles.chip, { backgroundColor: inputBg, borderColor }, pressed && { opacity: activeOpacity.default }]}
              
            >
              {profile.avatar ? (
                <Image source={{ uri: profile.avatar }} style={styles.chipAvatar} />
              ) : (
                <View style={[styles.chipAvatar, { backgroundColor: borderColor }]} />
              )}
              <ThemedText style={[styles.chipText, { color: textColor }]} numberOfLines={1}>
                {profile.displayName || profile.handle}
              </ThemedText>
              <IconSymbol name="xmark.circle.fill" size={16} color={iconColor} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={[styles.searchRow, { borderBottomColor: borderColor }]}>
        <IconSymbol name="magnifyingglass" size={18} color={iconColor} />
        <TextInput
          style={[styles.searchInput, { color: textColor }]}
          placeholder={t('messages.searchPlaceholder')}
          placeholderTextColor={iconColor}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          // oxlint-disable-next-line jsx-a11y/no-autofocus -- new-message screen opens to search for a recipient, keyboard should appear immediately
          autoFocus
        />
        {query.length > 0 ? (
          <Pressable
            onPress={() => {
              setQuery('');
              setSubmittedQuery('');
            }}
            hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.7 }}>
            <IconSymbol name="xmark.circle.fill" size={18} color={iconColor} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" style={styles.results}>
        {submittedQuery.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText style={[styles.emptyText, { color: iconColor }]}>
              {t('messages.searchHint')}
            </ThemedText>
          </View>
        ) : isLoading ? (
          <View style={styles.empty}>
            <ActivityIndicator />
          </View>
        ) : profiles.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText style={[styles.emptyText, { color: iconColor }]}>
              {t('search.noUsersFound')}
            </ThemedText>
          </View>
        ) : (
          profiles.map((profile) => (
            <Pressable
              key={profile.did}
              style={({ pressed }) => [styles.row, { borderBottomColor: borderColor }, pressed && { opacity: activeOpacity.default }]}
              onPress={() => handleAddMember(profile)}
              
              disabled={selected.length >= MAX_MEMBERS}
            >
              {profile.avatar ? (
                <Image source={{ uri: profile.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: borderColor }]} />
              )}
              <View style={styles.rowText}>
                <View style={styles.rowNameLine}>
                  <ThemedText style={[styles.rowName, { color: textColor }]} numberOfLines={1}>
                    {profile.displayName || profile.handle}
                  </ThemedText>
                  <VerificationBadge
                    verification={profile.verification}
                    subjectHandle={profile.handle}
                    subjectDisplayName={profile.displayName}
                    size={14}
                  />
                </View>
                <ThemedText style={[styles.rowHandle, { color: iconColor }]} numberOfLines={1}>
                  @{profile.handle}
                </ThemedText>
              </View>
              <IconSymbol name="plus" size={18} color={tintColor} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
  },
  headerAction: {
    fontSize: fontSize.lg,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: layout.hairline,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: layout.hairline,
    maxWidth: 200,
  },
  chipAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    flexShrink: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
  },
  results: {
    flex: 1,
  },
  empty: {
    paddingVertical: spacing.xxxxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.base,
    opacity: opacity.secondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: layout.hairline,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  rowText: {
    flex: 1,
  },
  rowNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  rowName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    flexShrink: 1,
  },
  rowHandle: {
    fontSize: fontSize.sm,
  },
});
