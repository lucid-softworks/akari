import React, { useCallback, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, radius, fontSize, fontWeight, layout, activeOpacity } from '@/constants/tokens';
import { useLists } from '@/hooks/queries/useLists';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import type { PostControls, ReplyAllow } from '@/utils/postControls';
import { DEFAULT_POST_CONTROLS } from '@/utils/postControls';

type PostControlsSheetProps = {
  visible: boolean;
  initialControls: PostControls;
  onDismiss: () => void;
  onSave: (controls: PostControls) => void;
};

export function PostControlsSheet({
  visible,
  initialControls,
  onDismiss,
  onSave,
}: PostControlsSheetProps) {
  const { t } = useTranslation();
  const { bottom } = useSafeAreaInsets();

  const sheetBg = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'text');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  const [draft, setDraft] = useState<PostControls>(initialControls);

  // Reset draft state every time the sheet opens so a previous-session
  // selection doesn't leak in if the user closed without saving.
  React.useEffect(() => {
    if (visible) setDraft(initialControls);
  }, [visible, initialControls]);

  const replyType: 'everyone' | 'limited' | 'nobody' = draft.replyAllow.type;

  const setReplyType = useCallback((type: typeof replyType) => {
    setDraft((d) => {
      if (type === 'everyone') return { ...d, replyAllow: { type: 'everyone' } };
      if (type === 'nobody') return { ...d, replyAllow: { type: 'nobody' } };
      // Switching to "limited" — preserve any existing limited-rule choices,
      // otherwise default to "following only".
      const existing = d.replyAllow.type === 'limited' ? d.replyAllow : null;
      return {
        ...d,
        replyAllow: existing ?? { type: 'limited', following: true },
      };
    });
  }, []);

  // Lists and the rule checkboxes are mutually exclusive: enabling a rule
  // clears any selected lists, and enabling a list clears the rules.
  // (The lexicon technically lets you combine them, but the user-facing
  // UX is "lists OR rules, not both".)
  const toggleLimitedRule = useCallback(
    (key: 'mention' | 'following' | 'follower') => {
      setDraft((d) => {
        const limited: Extract<ReplyAllow, { type: 'limited' }> =
          d.replyAllow.type === 'limited' ? { ...d.replyAllow } : { type: 'limited' };
        const willEnable = !limited[key];
        limited[key] = willEnable;
        if (willEnable) {
          limited.listUris = undefined;
        }
        const anyOn = limited.mention || limited.following || limited.follower || (limited.listUris?.length ?? 0) > 0;
        return { ...d, replyAllow: anyOn ? limited : { type: 'nobody' } };
      });
    },
    [],
  );

  const toggleListUri = useCallback((uri: string) => {
    setDraft((d) => {
      const limited: Extract<ReplyAllow, { type: 'limited' }> =
        d.replyAllow.type === 'limited' ? { ...d.replyAllow } : { type: 'limited' };
      const current = limited.listUris ?? [];
      const willEnable = !current.includes(uri);
      const next = willEnable ? [...current, uri] : current.filter((u) => u !== uri);
      limited.listUris = next.length > 0 ? next : undefined;
      if (willEnable) {
        limited.mention = false;
        limited.following = false;
        limited.follower = false;
      }
      const anyOn = limited.mention || limited.following || limited.follower || (limited.listUris?.length ?? 0) > 0;
      return { ...d, replyAllow: anyOn ? limited : { type: 'nobody' } };
    });
  }, []);

  // Lazy-load the user's lists when the limited section is shown — no
  // point fetching them otherwise.
  const listsQuery = useLists();
  const userLists = useMemo(
    () =>
      (listsQuery.data?.pages.flatMap((p) => p.lists) ?? []).filter((l) =>
        l.purpose.includes('curatelist'),
      ),
    [listsQuery.data],
  );

  const replyOptions = useMemo(
    () => [
      { key: 'everyone' as const, label: t('post.controls.everyoneReply') },
      { key: 'limited' as const, label: t('post.controls.limited') },
      { key: 'nobody' as const, label: t('post.controls.nobodyReply') },
    ],
    [t],
  );

  const handleReset = useCallback(() => setDraft(DEFAULT_POST_CONTROLS), []);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable
          style={[styles.sheetWrapper, { paddingBottom: bottom + spacing.md }]}
          onPress={(e) => e.stopPropagation()}
        >
          <ThemedView style={[styles.sheet, { backgroundColor: sheetBg, borderColor }]}>
            <View style={[styles.header, { borderBottomColor: borderColor }]}>
              <Pressable onPress={onDismiss} hitSlop={12} style={({ pressed }) => pressed && { opacity: 0.7 }}>
                <ThemedText style={[styles.headerAction, { color: iconColor }]}>
                  {t('common.cancel')}
                </ThemedText>
              </Pressable>
              <ThemedText style={[styles.headerTitle, { color: textColor }]}>
                {t('post.controls.title')}
              </ThemedText>
              <Pressable onPress={() => onSave(draft)} hitSlop={12} style={({ pressed }) => pressed && { opacity: 0.7 }}>
                <ThemedText style={[styles.headerAction, { color: tintColor, fontWeight: fontWeight.semibold }]}>
                  {t('common.save')}
                </ThemedText>
              </Pressable>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
              <ThemedText style={[styles.sectionLabel, { color: iconColor }]}>
                {t('post.controls.whoCanReply')}
              </ThemedText>
              {replyOptions.map((opt, idx) => (
                <View key={opt.key}>
                  {idx > 0 ? <View style={[styles.divider, { backgroundColor: borderColor }]} /> : null}
                  <Pressable
                    style={({ pressed }) => [styles.row, pressed && { opacity: activeOpacity.default }]}
                    onPress={() => setReplyType(opt.key)}
                    
                  >
                    <ThemedText style={[styles.rowText, { color: textColor }]}>{opt.label}</ThemedText>
                    {replyType === opt.key ? (
                      <IconSymbol name="checkmark" size={20} color={tintColor} />
                    ) : null}
                  </Pressable>
                </View>
              ))}

              {replyType === 'limited' ? (() => {
                const limited =
                  draft.replyAllow.type === 'limited' ? draft.replyAllow : null;
                const hasListSelection = (limited?.listUris?.length ?? 0) > 0;
                const hasRuleSelection = !!(limited?.mention || limited?.following || limited?.follower);

                return (
                  <View style={styles.subsection}>
                    <View style={hasListSelection ? styles.dimmedGroup : undefined}>
                      {(['mention', 'following', 'follower'] as const).map((key, idx) => {
                        const checked = !!limited?.[key];
                        const labelKey =
                          key === 'mention'
                            ? 'post.controls.mentionedOnly'
                            : key === 'following'
                            ? 'post.controls.followingOnly'
                            : 'post.controls.followersOnly';
                        return (
                          <View key={key}>
                            {idx > 0 ? <View style={[styles.divider, { backgroundColor: borderColor }]} /> : null}
                            <Pressable
                              style={({ pressed }) => [styles.row, pressed && { opacity: activeOpacity.default }]}
                              onPress={() => toggleLimitedRule(key)}
                              
                            >
                              <ThemedText style={[styles.rowText, { color: textColor }]}>{t(labelKey)}</ThemedText>
                              <IconSymbol
                                name={checked ? 'checkmark.square.fill' : 'square'}
                                size={20}
                                color={checked ? tintColor : iconColor}
                              />
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>

                    {userLists.length > 0 ? (
                      <View style={hasRuleSelection ? styles.dimmedGroup : undefined}>
                        <View style={[styles.divider, { backgroundColor: borderColor }]} />
                        <View style={styles.row}>
                          <ThemedText style={[styles.subsectionLabel, { color: iconColor }]}>
                            {t('post.controls.allowFromLists')}
                          </ThemedText>
                        </View>
                        {userLists.map((list, idx) => {
                          const checked = !!limited?.listUris?.includes(list.uri);
                          return (
                            <View key={list.uri}>
                              {idx > 0 ? <View style={[styles.divider, { backgroundColor: borderColor }]} /> : null}
                              <Pressable
                                style={({ pressed }) => [styles.row, pressed && { opacity: activeOpacity.default }]}
                                onPress={() => toggleListUri(list.uri)}
                                
                              >
                                <ThemedText
                                  style={[styles.rowText, { color: textColor }]}
                                  numberOfLines={1}
                                >
                                  {list.name}
                                </ThemedText>
                                <IconSymbol
                                  name={checked ? 'checkmark.square.fill' : 'square'}
                                  size={20}
                                  color={checked ? tintColor : iconColor}
                                />
                              </Pressable>
                            </View>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                );
              })() : null}

              <ThemedText style={[styles.sectionLabel, styles.sectionLabelSpaced, { color: iconColor }]}>
                {t('post.controls.embedding')}
              </ThemedText>
              <Pressable
                style={({ pressed }) => [styles.row, pressed && { opacity: activeOpacity.default }]}
                onPress={() => setDraft((d) => ({ ...d, allowQuote: !d.allowQuote }))}
                
              >
                <ThemedText style={[styles.rowText, { color: textColor }]}>
                  {t('post.controls.allowQuote')}
                </ThemedText>
                <IconSymbol
                  name={draft.allowQuote ? 'checkmark.square.fill' : 'square'}
                  size={20}
                  color={draft.allowQuote ? tintColor : iconColor}
                />
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.resetButton, pressed && { opacity: activeOpacity.default }]}
                onPress={handleReset}
                
              >
                <ThemedText style={[styles.resetText, { color: iconColor }]}>
                  {t('post.controls.reset')}
                </ThemedText>
              </Pressable>
            </ScrollView>
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetWrapper: { paddingHorizontal: spacing.lg },
  sheet: {
    borderRadius: radius.lg,
    borderWidth: layout.hairline,
    overflow: 'hidden',
    ...Platform.select({
      web: { maxWidth: 480, alignSelf: 'center', width: '100%' },
      default: {},
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
  },
  headerAction: { fontSize: fontSize.lg },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  scroll: { maxHeight: 480 },
  scrollContent: { paddingVertical: spacing.md },
  sectionLabel: {
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  sectionLabelSpaced: { marginTop: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowText: { fontSize: fontSize.base, fontWeight: fontWeight.medium, flex: 1 },
  divider: { height: layout.hairline, marginLeft: spacing.lg },
  subsection: {
    marginTop: spacing.xs,
    marginHorizontal: spacing.lg,
    borderRadius: radius.sm,
    borderWidth: layout.hairline,
    borderColor: 'transparent',
  },
  subsectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  dimmedGroup: {
    opacity: 0.4,
  },
  resetButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  resetText: { fontSize: fontSize.base, fontWeight: fontWeight.medium },
});
