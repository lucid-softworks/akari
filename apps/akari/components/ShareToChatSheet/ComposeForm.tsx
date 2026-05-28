import { Pressable, StyleSheet, View } from 'react-native';

import { PostInlineCard } from '@/components/PostInlineCard';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Textarea } from '@/components/ui/Textarea';
import { activeOpacity, fontSize, fontWeight, layout, radius, spacing } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

import { RecipientsRow } from './RecipientsRow';
import type { ConversationRow } from './types';

const BSKY_POST_URL_RX =
  /https?:\/\/(?:www\.)?bsky\.app\/profile\/([^/\s]+)\/post\/([^/\s?#]+)/i;

type ComposeFormProps = {
  selected: ConversationRow[];
  draft: string;
  message: string;
  sending: boolean;
  onDraftChange: (next: string) => void;
  onRemoveRecipient: (convo: ConversationRow) => void;
  onSend: () => void;
};

/**
 * Step 2 of the share sheet: chip strip of recipients, optional
 * message input, post preview, and send button. The post preview falls
 * back to a URL row when the shared message isn't a bsky.app post URL.
 */
export function ComposeForm({
  selected,
  draft,
  message,
  sending,
  onDraftChange,
  onRemoveRecipient,
  onSend,
}: ComposeFormProps) {
  const { t } = useTranslation();
  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'text');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  const match = message.match(BSKY_POST_URL_RX);
  const disabled = sending || selected.length === 0;

  return (
    <View style={styles.composeContainer}>
      <RecipientsRow selected={selected} onRemove={onRemoveRecipient} />

      <Textarea
        inputStyle={styles.textareaInput}
        minHeight={80}
        value={draft}
        onChangeText={onDraftChange}
        placeholder={t('post.share.addMessagePlaceholder')}
        placeholderTextColor={iconColor}
        // oxlint-disable-next-line jsx-a11y/no-autofocus -- share sheet opens to let the user immediately type a message alongside the shared post
        autoFocus
        maxLength={1000}
        selectionColor={tintColor}
        cursorColor={tintColor}
      />

      {match ? (
        <PostInlineCard handle={match[1]} rkey={match[2]} style={styles.postPreview} />
      ) : (
        <View style={[styles.urlPreview, { borderColor }]}>
          <IconSymbol name="link" size={14} color={iconColor} />
          <ThemedText
            style={[styles.urlPreviewText, { color: iconColor }]}
            numberOfLines={1}
          >
            {message}
          </ThemedText>
        </View>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.sendButton,
          { backgroundColor: tintColor },
          disabled && styles.sendButtonDisabled,
          pressed && { opacity: activeOpacity.default },
        ]}
        onPress={onSend}
        disabled={disabled}
      >
        <ThemedText style={styles.sendButtonText}>
          {sending ? t('common.saving') : t('post.share.send')}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  composeContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  textareaInput: {
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
