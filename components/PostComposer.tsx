import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useCreatePost } from '@/hooks/mutations/useCreatePost';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type PostComposerProps = {
  visible: boolean;
  onClose: () => void;
  replyTo?: {
    root: string;
    parent: string;
    authorHandle: string;
  };
};

export function PostComposer({ visible, onClose, replyTo }: PostComposerProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const createPostMutation = useCreatePost();

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({}, 'icon');
  const tintColor = useThemeColor({}, 'tint');

  const handlePost = async () => {
    if (!text.trim()) return;

    try {
      await createPostMutation.mutateAsync({
        text: text.trim(),
        replyTo: replyTo
          ? {
              root: replyTo.root,
              parent: replyTo.parent,
            }
          : undefined,
      });

      // Reset form and close
      setText('');
      onClose();
    } catch (error) {
      // Error handling could be improved with a proper error display
      console.error('Failed to create post:', error);
    }
  };

  const handleClose = () => {
    setText('');
    onClose();
  };

  const isPostDisabled = !text.trim() || createPostMutation.isPending;
  const characterCount = text.length;
  const maxCharacters = 300;
  const isNearLimit = characterCount > maxCharacters * 0.8;
  const isOverLimit = characterCount > maxCharacters;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
    >
      <KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ThemedView style={styles.overlay}>
          <ThemedView style={[styles.container, { backgroundColor }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: borderColor }]}>
              <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
                <ThemedText style={[styles.headerButtonText, { color: iconColor }]}>{t('common.cancel')}</ThemedText>
              </TouchableOpacity>

              <ThemedText type="defaultSemiBold" style={[styles.headerTitle, { color: textColor }]}>
                {replyTo ? t('post.reply') : t('post.newPost')}
              </ThemedText>

              <TouchableOpacity
                onPress={handlePost}
                style={[
                  styles.postButton,
                  isPostDisabled ? styles.postButtonDisabled : styles.postButtonEnabled,
                  { backgroundColor: isPostDisabled ? borderColor : tintColor },
                ]}
                disabled={isPostDisabled}
              >
                <ThemedText style={[styles.postButtonText, { color: isPostDisabled ? textColor : '#000000' }]}>
                  {createPostMutation.isPending ? t('post.posting') : t('post.post')}
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Reply Context */}
            {replyTo && (
              <ThemedView style={[styles.replyContext, { borderBottomColor: borderColor }]}>
                <View style={[styles.replyIconContainer, { backgroundColor: borderColor }]}>
                  <IconSymbol name="arrowshape.turn.up.left" size={14} color={iconColor} />
                </View>
                <ThemedText style={[styles.replyText, { color: textColor }]}>
                  {t('post.replyingTo')}{' '}
                  <ThemedText style={[styles.replyAuthor, { color: tintColor }]}>@{replyTo.authorHandle}</ThemedText>
                </ThemedText>
              </ThemedView>
            )}

            {/* Text Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.textInput, { color: textColor }, Platform.OS === 'web' && { outline: 'none' }]}
                value={text}
                onChangeText={setText}
                placeholder={replyTo ? t('post.replyPlaceholder') : t('post.postPlaceholder')}
                placeholderTextColor={iconColor}
                multiline
                autoFocus
                maxLength={maxCharacters}
                textAlignVertical="top"
                selectionColor="transparent"
                cursorColor={textColor}
              />
            </View>

            {/* Footer with Character Count and Actions */}
            <View style={[styles.footer, { borderTopColor: borderColor }]}>
              <View style={styles.footerLeft}>{/* Add action buttons here in the future */}</View>

              <View style={styles.footerRight}>
                <View style={styles.characterCountContainer}>
                  <ThemedText
                    style={[
                      styles.characterCount,
                      {
                        color: isOverLimit ? '#FF3B30' : isNearLimit ? '#FF9500' : iconColor,
                      },
                    ]}
                  >
                    {characterCount}
                  </ThemedText>
                  <ThemedText style={[styles.characterCount, { color: iconColor }]}>/{maxCharacters}</ThemedText>
                </View>
              </View>
            </View>
          </ThemedView>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
  },
  container: {
    margin: 20,
    minHeight: 400,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  postButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  postButtonEnabled: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  postButtonDisabled: {
    opacity: 0.6,
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  replyContext: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  replyIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  replyText: {
    fontSize: 15,
    opacity: 0.8,
  },
  replyAuthor: {
    fontWeight: '600',
  },
  inputContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  textInput: {
    flex: 1,
    fontSize: 18,
    lineHeight: 26,
    minHeight: 140,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 0.5,
  },
  footerLeft: {
    flex: 1,
  },
  footerRight: {
    alignItems: 'flex-end',
  },
  characterCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  characterCount: {
    fontSize: 15,
    fontWeight: '500',
  },
});
