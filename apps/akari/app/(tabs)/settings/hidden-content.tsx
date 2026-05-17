import { Image } from '@/components/Image';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PostInlineCard } from '@/components/PostInlineCard';
import { SettingsSection } from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { fontSize, fontWeight, layout, radius, spacing } from '@/constants/tokens';
import { useProfile } from '@/hooks/queries/useProfile';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useHiddenContent } from '@/hooks/useHiddenContent';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

/** Parses an at:// URI down to the actor DID + rkey so we can hand
 *  them to the inline post card hook (which keys off the public-handle
 *  shape that getPost accepts). */
function parsePostUri(uri: string): { actor: string; rkey: string } | null {
  const match = uri.match(/^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/(.+)$/);
  if (!match) return null;
  return { actor: match[1], rkey: match[2] };
}

export default function HiddenContentScreen() {
  const { t } = useTranslation();
  const borderColor = useBorderColor();
  const iconColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'text');
  const tintColor = useThemeColor({}, 'tint');

  const { hiddenPosts, hiddenAccounts, unhidePost, unhideAccount } = useHiddenContent();
  const postUris = useMemo(() => Array.from(hiddenPosts), [hiddenPosts]);
  const accountDids = useMemo(() => Array.from(hiddenAccounts), [hiddenAccounts]);

  return (
    <SettingsSubpageLayout title={t('settings.hiddenContent')}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <SettingsSection isFirst title={t('settings.hiddenAccounts')}>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            {accountDids.length === 0 ? (
              <View style={styles.emptyRow}>
                <ThemedText style={[styles.emptyText, { color: iconColor }]}>
                  {t('settings.noHiddenAccounts')}
                </ThemedText>
              </View>
            ) : (
              accountDids.map((did, idx) => (
                <View key={did}>
                  {idx > 0 ? (
                    <View style={[styles.divider, { backgroundColor: borderColor }]} />
                  ) : null}
                  <HiddenAccountRow
                    did={did}
                    onUnhide={() => unhideAccount(did)}
                    iconColor={iconColor}
                    tintColor={tintColor}
                    borderColor={borderColor}
                  />
                </View>
              ))
            )}
          </ThemedView>
        </SettingsSection>

        <SettingsSection title={t('settings.hiddenPosts')}>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            {postUris.length === 0 ? (
              <View style={styles.emptyRow}>
                <ThemedText style={[styles.emptyText, { color: iconColor }]}>
                  {t('settings.noHiddenPosts')}
                </ThemedText>
              </View>
            ) : (
              postUris.map((uri, idx) => {
                const parsed = parsePostUri(uri);
                return (
                  <View key={uri} style={styles.postRow}>
                    {idx > 0 ? (
                      <View style={[styles.divider, { backgroundColor: borderColor }]} />
                    ) : null}
                    <View style={styles.postRowInner}>
                      <View style={styles.postRowCard}>
                        {parsed ? (
                          <PostInlineCard handle={parsed.actor} rkey={parsed.rkey} />
                        ) : (
                          <ThemedText
                            style={[styles.fallbackUri, { color: iconColor }]}
                            numberOfLines={1}
                          >
                            {uri}
                          </ThemedText>
                        )}
                      </View>
                      <Pressable
                        onPress={() => unhidePost(uri)}
                        style={({ pressed }) => [styles.unhideButton, { borderColor: tintColor }, pressed && { opacity: 0.7 }]}
                        accessibilityLabel={t('settings.unhide')}
                      >
                        <ThemedText style={[styles.unhideText, { color: tintColor }]}>
                          {t('settings.unhide')}
                        </ThemedText>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </ThemedView>
        </SettingsSection>
      </ScrollView>
    </SettingsSubpageLayout>
  );
}

type HiddenAccountRowProps = {
  did: string;
  onUnhide: () => void;
  iconColor: string;
  tintColor: string;
  borderColor: string;
};

function HiddenAccountRow({ did, onUnhide, iconColor, tintColor, borderColor }: HiddenAccountRowProps) {
  const { t } = useTranslation();
  const { data: profile } = useProfile(did);
  const textColor = useThemeColor({}, 'text');
  return (
    <View style={styles.accountRow}>
      {profile?.avatar ? (
        <Image source={{ uri: profile.avatar }} style={styles.accountAvatar} />
      ) : (
        <View style={[styles.accountAvatar, { backgroundColor: borderColor }]}>
          <IconSymbol name="person.fill" size={16} color={iconColor} />
        </View>
      )}
      <View style={styles.accountText}>
        <ThemedText
          style={[styles.accountName, { color: textColor }]}
          numberOfLines={1}
        >
          {profile?.displayName || profile?.handle || did}
        </ThemedText>
        <ThemedText
          style={[styles.accountHandle, { color: iconColor }]}
          numberOfLines={1}
        >
          @{profile?.handle ?? did}
        </ThemedText>
      </View>
      <Pressable
        onPress={onUnhide}
        style={({ pressed }) => [styles.unhideButton, { borderColor: tintColor }, pressed && { opacity: 0.7 }]}
        accessibilityLabel={t('settings.unhide')}
      >
        <ThemedText style={[styles.unhideText, { color: tintColor }]}>
          {t('settings.unhide')}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  contentContainer: { paddingBottom: 32 },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: layout.hairline,
    backgroundColor: 'transparent',
  },
  emptyRow: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  emptyText: { fontSize: fontSize.base },
  divider: { height: layout.hairline },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  accountAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  accountText: { flex: 1 },
  accountName: { fontSize: fontSize.base, fontWeight: fontWeight.medium },
  accountHandle: { fontSize: fontSize.sm, marginTop: 2 },
  postRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  postRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  postRowCard: { flex: 1 },
  fallbackUri: { fontSize: fontSize.sm },
  unhideButton: {
    borderWidth: layout.hairline,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  unhideText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
});
