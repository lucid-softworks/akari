import { Image } from '@/components/Image';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type ListRenderItem,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PostInlineCard } from '@/components/PostInlineCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { activeOpacity, fontSize, fontWeight, layout, radius, spacing } from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useSendMessage } from '@/hooks/mutations/useSendMessage';
import { useConversations } from '@/hooks/queries/useConversations';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

const BSKY_POST_URL_RX =
  /https?:\/\/(?:www\.)?bsky\.app\/profile\/([^/\s]+)\/post\/([^/\s?#]+)/i;

type ShareToChatSheetProps = {
  visible: boolean;
  onDismiss: () => void;
  /** Bluesky URL of the post — used for the inline preview card and
   *  also as a fallback in case the recipient's client doesn't render
   *  the record embed yet. */
  message: string;
  /** at:// URI of the post being shared. Required so the message can
   *  attach a real `app.bsky.embed.record` (the official client looks
   *  for this; sending only the URL leaves it as a plain link). */
  postUri: string;
  postCid: string;
};

type ConversationRow = {
  id: string;
  convoId: string;
  handle: string;
  displayName: string;
  avatar?: string;
  isGroup: boolean;
};

const keyExtractor = (item: ConversationRow) => item.convoId;

type ConversationListRowProps = {
  item: ConversationRow;
  checked: boolean;
  onToggle: (convo: ConversationRow) => void;
  borderColor: string;
  textColor: string;
  iconColor: string;
  tintColor: string;
};

const ConversationListRow = memo(function ConversationListRow({
  item,
  checked,
  onToggle,
  borderColor,
  textColor,
  iconColor,
  tintColor,
}: ConversationListRowProps) {
  const avatarSource = useMemo(
    () => (item.avatar ? { uri: item.avatar } : undefined),
    [item.avatar],
  );
  const handlePress = useCallback(() => onToggle(item), [onToggle, item]);
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && { opacity: activeOpacity.default }]}
      onPress={handlePress}
    >
      {avatarSource ? (
        <Image source={avatarSource} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: borderColor }]} />
      )}
      <View style={styles.rowText}>
        <ThemedText style={[styles.displayName, { color: textColor }]} numberOfLines={1}>
          {item.displayName}
        </ThemedText>
        <ThemedText style={[styles.handle, { color: iconColor }]} numberOfLines={1}>
          @{item.handle}
        </ThemedText>
      </View>
      <IconSymbol
        name={checked ? 'checkmark.circle.fill' : 'circle'}
        size={22}
        color={checked ? tintColor : iconColor}
      />
    </Pressable>
  );
});

export function ShareToChatSheet({
  visible,
  onDismiss,
  message,
  postUri,
  postCid,
}: ShareToChatSheetProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { bottom } = useSafeAreaInsets();
  const sendMutation = useSendMessage();

  const sheetBg = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'text');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  const { data, isLoading } = useConversations(50, undefined, 'accepted', visible);
  const conversations: ConversationRow[] =
    data?.pages.flatMap((page) => page.conversations) ?? [];

  // Multi-recipient flow: tap to add/remove a conversation, then "Next"
  // moves into the compose step where the user can attach an optional
  // message before sending to all selected recipients in parallel. All
  // four fields reset atomically on close, so we keep them as a single
  // state object (the rule flagged the per-field setter pile-up).
  type ShareState = {
    selected: ConversationRow[];
    step: 'pick' | 'compose';
    draft: string;
    sending: boolean;
  };
  const INITIAL_STATE: ShareState = {
    selected: [],
    step: 'pick',
    draft: '',
    sending: false,
  };
  const [state, setState] = useState<ShareState>(INITIAL_STATE);
  const { selected, step, draft, sending } = state;
  const setSelected = useCallback(
    (updater: ConversationRow[] | ((prev: ConversationRow[]) => ConversationRow[])) => {
      setState((prev) => ({
        ...prev,
        selected: typeof updater === 'function' ? updater(prev.selected) : updater,
      }));
    },
    [],
  );
  const setStep = useCallback((step: 'pick' | 'compose') => {
    setState((prev) => ({ ...prev, step }));
  }, []);
  const setDraft = useCallback((draft: string) => {
    setState((prev) => ({ ...prev, draft }));
  }, []);
  const setSending = useCallback((sending: boolean) => {
    setState((prev) => ({ ...prev, sending }));
  }, []);

  useEffect(() => {
    if (!visible) {
      setState(INITIAL_STATE);
    }
    // INITIAL_STATE is a stable module-ish literal; depending on it would
    // require useMemo and add noise. Tracking only `visible` is correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const toggleSelect = useCallback((convo: ConversationRow) => {
    setSelected((prev) =>
      prev.some((c) => c.convoId === convo.convoId)
        ? prev.filter((c) => c.convoId !== convo.convoId)
        : [...prev, convo],
    );
  }, []);

  const selectedIds = useMemo(
    () => new Set(selected.map((c) => c.convoId)),
    [selected],
  );

  // Send the user's optional message as text and the post itself as a
  // proper `app.bsky.embed.record` so any client (including the
  // official Bluesky app) renders it as an inline post card. We do
  // NOT pack the URL into the text — clients that render the embed
  // would otherwise show it twice.
  const trimmedDraft = draft.trim();
  const embedPayload = {
    $type: 'app.bsky.embed.record' as const,
    record: { uri: postUri, cid: postCid },
  };

  const handleSend = async () => {
    if (selected.length === 0) return;
    setSending(true);
    try {
      const results = await Promise.allSettled(
        selected.map((c) =>
          sendMutation.mutateAsync({
            convoId: c.convoId,
            text: trimmedDraft,
            embed: embedPayload,
          }),
        ),
      );
      const failures = results.filter((r) => r.status === 'rejected').length;
      if (failures === results.length) {
        showToast({ type: 'error', message: t('common.somethingWentWrong') });
      } else if (failures > 0) {
        showToast({
          type: 'success',
          message: t('post.share.sentToChatPartial', { count: results.length - failures }),
        });
        onDismiss();
      } else {
        showToast({ type: 'success', message: t('post.share.sentToChat') });
        onDismiss();
      }
    } finally {
      setSending(false);
    }
  };

  const itemSeparator = useCallback(
    () => <View style={[styles.divider, { backgroundColor: borderColor }]} />,
    [borderColor],
  );

  const renderRow = useCallback<ListRenderItem<ConversationRow>>(
    ({ item }) => (
      <ConversationListRow
        item={item}
        checked={selectedIds.has(item.convoId)}
        onToggle={toggleSelect}
        borderColor={borderColor}
        textColor={textColor}
        iconColor={iconColor}
        tintColor={tintColor}
      />
    ),
    [borderColor, iconColor, selectedIds, textColor, tintColor, toggleSelect],
  );

  const renderList = () => {
    if (isLoading && conversations.length === 0) {
      return (
        <View style={styles.loadingState}>
          <ActivityIndicator color={iconColor} />
        </View>
      );
    }
    if (conversations.length === 0) {
      return (
        <View style={styles.emptyState}>
          <ThemedText style={[styles.emptyText, { color: iconColor }]}>
            {t('common.noConversations')}
          </ThemedText>
        </View>
      );
    }
    return (
      <>
        <FlatList
          style={styles.list}
          data={conversations}
          keyExtractor={keyExtractor}
          ItemSeparatorComponent={itemSeparator}
          renderItem={renderRow}
        />
        {selected.length > 0 ? (
          <View style={[styles.nextBar, { borderTopColor: borderColor }]}>
            <Pressable
              style={({ pressed }) => [styles.nextButton, { backgroundColor: tintColor }, pressed && { opacity: activeOpacity.default }]}
              onPress={() => setStep('compose')}

            >
              <ThemedText style={styles.nextButtonText}>
                {t('post.share.nextWithCount', { count: selected.length })}
              </ThemedText>
            </Pressable>
          </View>
        ) : null}
      </>
    );
  };

  const renderCompose = () => (
    <View style={styles.composeContainer}>
      <View style={[styles.recipientsRow, { borderBottomColor: borderColor }]}>
        <ThemedText style={[styles.recipientsLabel, { color: iconColor }]}>
          {t('post.share.toLabel')}
        </ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recipientsChips}
        >
          {/* oxlint-disable-next-line react-doctor/rn-no-scrollview-mapped-list -- Bounded selected-recipients chip row (user picks a handful), virtualization overhead > scan cost */}
          {selected.map((c) => (
            <View key={c.convoId} style={[styles.chip, { borderColor }]}>
              {c.avatar ? (
                <Image source={{ uri: c.avatar }} style={styles.chipAvatar} />
              ) : (
                <View style={[styles.chipAvatar, { backgroundColor: borderColor }]} />
              )}
              <ThemedText
                style={[styles.chipText, { color: textColor }]}
                numberOfLines={1}
              >
                {c.displayName}
              </ThemedText>
              <Pressable onPress={() => toggleSelect(c)} hitSlop={6} style={({ pressed }) => pressed && { opacity: 0.7 }}>
                <IconSymbol name="xmark" size={12} color={iconColor} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </View>

      <TextInput
        style={[styles.textInput, { color: textColor }]}
        value={draft}
        onChangeText={setDraft}
        placeholder={t('post.share.addMessagePlaceholder')}
        placeholderTextColor={iconColor}
        multiline
        // oxlint-disable-next-line jsx-a11y/no-autofocus -- share sheet opens to let the user immediately type a message alongside the shared post
        autoFocus
        maxLength={1000}
        textAlignVertical="top"
        selectionColor={tintColor}
        cursorColor={tintColor}
      />

      {(() => {
        const match = message.match(BSKY_POST_URL_RX);
        if (match) {
          return <PostInlineCard handle={match[1]} rkey={match[2]} style={styles.postPreview} />;
        }
        return (
          <View style={[styles.urlPreview, { borderColor }]}>
            <IconSymbol name="link" size={14} color={iconColor} />
            <ThemedText
              style={[styles.urlPreviewText, { color: iconColor }]}
              numberOfLines={1}
            >
              {message}
            </ThemedText>
          </View>
        );
      })()}

      <Pressable
        style={({ pressed }) => [styles.sendButton,
          { backgroundColor: tintColor },
          (sending || selected.length === 0) && styles.sendButtonDisabled, pressed && { opacity: activeOpacity.default }]}
        onPress={handleSend}
        disabled={sending || selected.length === 0}
        
      >
        <ThemedText style={styles.sendButtonText}>
          {sending ? t('common.saving') : t('post.share.send')}
        </ThemedText>
      </Pressable>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable
          style={[styles.sheetWrapper, { paddingBottom: bottom + spacing.md }]}
          onPress={(e) => e.stopPropagation()}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ThemedView style={[styles.sheet, { backgroundColor: sheetBg, borderColor }]}>
              <View style={[styles.header, { borderBottomColor: borderColor }]}>
                <View style={styles.headerSide}>
                  {step === 'compose' ? (
                    <Pressable onPress={() => setStep('pick')} hitSlop={12} style={({ pressed }) => pressed && { opacity: 0.7 }}>
                      <ThemedText style={[styles.headerAction, { color: iconColor }]}>
                        {t('common.back')}
                      </ThemedText>
                    </Pressable>
                  ) : null}
                </View>
                <ThemedText style={[styles.headerTitle, { color: textColor }]}>
                  {t('post.share.sendToChat')}
                </ThemedText>
                <View style={styles.headerSide}>
                  <Pressable onPress={onDismiss} hitSlop={12} style={({ pressed }) => pressed && { opacity: 0.7 }}>
                    <ThemedText style={[styles.headerAction, { color: iconColor }]}>
                      {t('common.cancel')}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>

              {step === 'pick' ? renderList() : renderCompose()}
            </ThemedView>
          </KeyboardAvoidingView>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
  },
  headerSide: { minWidth: 60 },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, flex: 1, textAlign: 'center' },
  headerAction: { fontSize: fontSize.lg },
  list: { maxHeight: 380 },
  loadingState: { paddingVertical: spacing.xxl, alignItems: 'center' },
  emptyState: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xxl, alignItems: 'center' },
  emptyText: { fontSize: fontSize.base },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  rowText: { flex: 1 },
  displayName: { fontSize: fontSize.base, fontWeight: fontWeight.medium },
  handle: { fontSize: fontSize.sm, marginTop: 2 },
  divider: { height: layout.hairline, marginLeft: spacing.lg + 36 + spacing.md },
  nextBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: layout.hairline,
  },
  nextButton: {
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
    alignItems: 'center',
  },
  nextButtonText: { color: '#000000', fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  composeContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  recipientsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: layout.hairline,
  },
  recipientsLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  recipientsChips: { gap: spacing.xs, paddingRight: spacing.md, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: layout.hairline,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    maxWidth: 180,
  },
  chipAvatar: { width: 18, height: 18, borderRadius: 9 },
  chipText: { fontSize: fontSize.sm },
  textInput: {
    minHeight: 80,
    fontSize: fontSize.base,
    lineHeight: 22,
  },
  urlPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: layout.hairline,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  urlPreviewText: { fontSize: fontSize.sm, flex: 1 },
  postPreview: { width: '100%' },
  sendButton: {
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
    alignItems: 'center',
  },
  sendButtonDisabled: { opacity: 0.5 },
  sendButtonText: { color: '#000000', fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
});
