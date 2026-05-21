import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/ThemedView';
import { layout, radius, spacing } from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useSendMessage } from '@/hooks/mutations/useSendMessage';
import { useConversations } from '@/hooks/queries/useConversations';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

import { ComposeForm } from './ShareToChatSheet/ComposeForm';
import { ConversationPickList } from './ShareToChatSheet/ConversationPickList';
import { SheetHeader } from './ShareToChatSheet/SheetHeader';
import type { ConversationRow } from './ShareToChatSheet/types';

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

  const { data, isLoading } = useConversations(50, undefined, 'accepted', visible);
  const conversations: ConversationRow[] =
    data?.pages.flatMap((page) => page.conversations) ?? [];

  // Multi-recipient flow: tap to add/remove a conversation, then "Next"
  // moves into the compose step where the user can attach an optional
  // message before sending to all selected recipients in parallel. All
  // four fields reset atomically on close, so we keep them as a single
  // state object (the rule flagged the per-field setter pile-up).
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
  const setStep = useCallback((nextStep: 'pick' | 'compose') => {
    setState((prev) => ({ ...prev, step: nextStep }));
  }, []);
  const setDraft = useCallback((nextDraft: string) => {
    setState((prev) => ({ ...prev, draft: nextDraft }));
  }, []);
  const setSending = useCallback((nextSending: boolean) => {
    setState((prev) => ({ ...prev, sending: nextSending }));
  }, []);

  useEffect(() => {
    if (!visible) {
      setState(INITIAL_STATE);
    }
  }, [visible]);

  const toggleSelect = useCallback(
    (convo: ConversationRow) => {
      setSelected((prev) =>
        prev.some((c) => c.convoId === convo.convoId)
          ? prev.filter((c) => c.convoId !== convo.convoId)
          : [...prev, convo],
      );
    },
    [setSelected],
  );

  const selectedIds = useMemo(
    () => new Set(selected.map((c) => c.convoId)),
    [selected],
  );

  // Send the user's optional message as text and the post itself as a
  // proper `app.bsky.embed.record` so any client (including the
  // official Bluesky app) renders it as an inline post card. We do
  // NOT pack the URL into the text — clients that render the embed
  // would otherwise show it twice.
  const handleSend = async () => {
    if (selected.length === 0) return;
    setSending(true);
    try {
      const trimmedDraft = draft.trim();
      const embedPayload = {
        $type: 'app.bsky.embed.record' as const,
        record: { uri: postUri, cid: postCid },
      };
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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable
          style={[styles.sheetWrapper, { paddingBottom: bottom + spacing.md }]}
          onPress={(e) => e.stopPropagation()}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ThemedView style={[styles.sheet, { backgroundColor: sheetBg, borderColor }]}>
              <SheetHeader
                step={step}
                onBack={() => setStep('pick')}
                onDismiss={onDismiss}
              />

              {step === 'pick' ? (
                <ConversationPickList
                  conversations={conversations}
                  isLoading={isLoading}
                  selectedIds={selectedIds}
                  selectedCount={selected.length}
                  onToggle={toggleSelect}
                  onNext={() => setStep('compose')}
                />
              ) : (
                <ComposeForm
                  selected={selected}
                  draft={draft}
                  message={message}
                  sending={sending}
                  onDraftChange={setDraft}
                  onRemoveRecipient={toggleSelect}
                  onSend={handleSend}
                />
              )}
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
});
