import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTranslation } from '@/hooks/useTranslation';

import { styles } from './styles';

type ComposerHeaderState = {
  mode: 'standard' | 'autothread' | 'longform';
  /** 'new', 'reply', or 'quote'. Drives the title copy. */
  kind: 'new' | 'reply' | 'quote';
  /** 'idle', 'posting', or 'publishingLongform'. Drives the button label. */
  pending: 'idle' | 'posting' | 'publishingLongform';
  postDisabled: boolean;
};

type ComposerHeaderProps = {
  state: ComposerHeaderState;
  borderColor: string;
  textColor: string;
  iconColor: string;
  tintColor: string;
  onCancel: () => void;
  onPost: () => void;
};

export function ComposerHeader({
  state,
  borderColor,
  textColor,
  iconColor,
  tintColor,
  onCancel,
  onPost,
}: ComposerHeaderProps) {
  const { t } = useTranslation();
  const { mode, kind, pending, postDisabled: isPostDisabled } = state;
  const isReply = kind === 'reply';
  const isQuote = kind === 'quote';
  const isPosting = pending === 'posting';
  const isPublishingLongform = pending === 'publishingLongform';

  return (
    <View style={[styles.header, { borderBottomColor: borderColor }]}>
      <Pressable
        onPress={onCancel}
        style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.7 }]}
      >
        <ThemedText style={[styles.headerButtonText, { color: iconColor }]}>
          {t('common.cancel')}
        </ThemedText>
      </Pressable>

      <ThemedText type="defaultSemiBold" style={[styles.headerTitle, { color: textColor }]}>
        {isReply ? t('post.reply') : isQuote ? t('post.quotePost') : t('post.newPost')}
      </ThemedText>

      <Pressable
        onPress={onPost}
        style={({ pressed }) => [
          styles.postButton,
          isPostDisabled ? styles.postButtonDisabled : styles.postButtonEnabled,
          { backgroundColor: isPostDisabled ? borderColor : tintColor },
          pressed && { opacity: 0.7 },
        ]}
        disabled={isPostDisabled}
      >
        <ThemedText
          style={[styles.postButtonText, { color: isPostDisabled ? textColor : '#000000' }]}
        >
          {mode === 'longform'
            ? isPublishingLongform
              ? t('post.longform.publishing')
              : t('post.longform.publishButton')
            : isPosting
            ? t('post.posting')
            : t('post.post')}
        </ThemedText>
      </Pressable>
    </View>
  );
}
