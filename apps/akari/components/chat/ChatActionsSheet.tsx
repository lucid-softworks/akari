import React, { useCallback } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, radius, fontSize, fontWeight, layout, activeOpacity, semanticColors } from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useBlockUser } from '@/hooks/mutations/useBlockUser';
import { useLeaveConvo, useMuteConvo } from '@/hooks/mutations/useGroupConvo';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type ChatActionsSheetProps = {
  visible: boolean;
  onDismiss: () => void;
  convoId: string;
  isMuted: boolean;
  /** Group convos hide the per-account actions (block, etc.). */
  isGroup: boolean;
  /** For 1:1 chats — the peer DID the block / report acts on. */
  peerDid?: string;
  /** Optional: open the system Report flow against the peer DID. */
  onReportPress?: () => void;
  /** Called after the user successfully leaves the convo so the host can pop. */
  onLeft?: () => void;
};

type SheetItem = {
  key: string;
  label: string;
  icon: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

export function ChatActionsSheet({
  visible,
  onDismiss,
  convoId,
  isMuted,
  isGroup,
  peerDid,
  onReportPress,
  onLeft,
}: ChatActionsSheetProps) {
  const { t } = useTranslation();
  const { bottom } = useSafeAreaInsets();
  const { showToast } = useToast();

  const sheetBg = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'text');
  const textColor = useThemeColor({}, 'text');

  const muteMutation = useMuteConvo();
  const leaveMutation = useLeaveConvo();
  const blockMutation = useBlockUser();

  const handleToggleMute = useCallback(() => {
    muteMutation.mutate(
      { convoId, action: isMuted ? 'unmute' : 'mute' },
      {
        onSuccess: () =>
          showToast({
            message: isMuted ? t('messages.unmuted') : t('messages.muted'),
            type: 'success',
          }),
        onError: () => showToast({ message: t('common.error'), type: 'error' }),
      },
    );
    onDismiss();
  }, [convoId, isMuted, muteMutation, showToast, t, onDismiss]);

  const handleBlock = useCallback(() => {
    if (!peerDid) return;
    Alert.alert(t('messages.blockAccount'), t('messages.blockAccountConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('messages.block'),
        style: 'destructive',
        onPress: () => {
          blockMutation.mutate(
            { did: peerDid, action: 'block' },
            {
              onSuccess: () => {
                showToast({ message: t('messages.blocked'), type: 'success' });
                onDismiss();
              },
              onError: () => showToast({ message: t('common.error'), type: 'error' }),
            },
          );
        },
      },
    ]);
  }, [peerDid, blockMutation, showToast, t, onDismiss]);

  const handleReport = useCallback(() => {
    onDismiss();
    onReportPress?.();
  }, [onDismiss, onReportPress]);

  const handleLeave = useCallback(() => {
    Alert.alert(t('messages.leaveChat'), t('messages.leaveChatConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('messages.leave'),
        style: 'destructive',
        onPress: () => {
          leaveMutation.mutate(
            { convoId },
            {
              onSuccess: () => {
                onDismiss();
                onLeft?.();
              },
              onError: () => showToast({ message: t('common.error'), type: 'error' }),
            },
          );
        },
      },
    ]);
  }, [convoId, leaveMutation, showToast, t, onDismiss, onLeft]);

  const items: SheetItem[] = [
    {
      key: 'mute',
      icon: isMuted ? 'speaker.wave.2' : 'speaker.slash',
      label: isMuted ? t('messages.unmuteConversation') : t('messages.muteConversation'),
      onPress: handleToggleMute,
    },
    ...(!isGroup && peerDid
      ? [
          {
            key: 'block',
            icon: 'hand.raised',
            label: t('messages.blockAccount'),
            onPress: handleBlock,
            destructive: true,
          },
        ]
      : []),
    {
      key: 'report',
      icon: 'exclamationmark.triangle',
      label: t('messages.reportConversation'),
      onPress: handleReport,
      destructive: true,
      disabled: !onReportPress,
    },
    {
      key: 'leave',
      icon: 'rectangle.portrait.and.arrow.right',
      label: isGroup ? t('messages.leaveChat') : t('messages.deleteChat'),
      onPress: handleLeave,
      destructive: true,
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable
          style={[styles.sheetWrapper, { paddingBottom: bottom + spacing.md }]}
          onPress={(event) => event.stopPropagation()}
        >
          <ThemedView style={[styles.sheet, { backgroundColor: sheetBg, borderColor }]}>
            {items.map((item, idx) => (
              <React.Fragment key={item.key}>
                {idx > 0 ? <View style={[styles.divider, { backgroundColor: borderColor }]} /> : null}
                <Pressable
                  style={({ pressed }) => [styles.item, item.disabled && styles.itemDisabled, pressed && { opacity: item.disabled ? 1 : activeOpacity.default }]}
                  onPress={item.disabled ? undefined : item.onPress}
                  disabled={item.disabled}
                  
                  accessibilityRole="button"
                >
                  <IconSymbol
                    name={item.icon as any}
                    size={22}
                    color={item.destructive ? semanticColors.danger : iconColor}
                  />
                  <ThemedText
                    style={[
                      styles.itemText,
                      { color: item.destructive ? semanticColors.danger : textColor },
                    ]}
                  >
                    {item.label}
                  </ThemedText>
                </Pressable>
              </React.Fragment>
            ))}
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
  sheetWrapper: {
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    borderRadius: radius.lg,
    borderWidth: layout.hairline,
    overflow: 'hidden',
    ...Platform.select({
      web: { maxWidth: 420, alignSelf: 'center', width: '100%' },
      default: {},
    }),
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  itemDisabled: {
    opacity: 0.4,
  },
  itemText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    flex: 1,
  },
  divider: {
    height: layout.hairline,
  },
});
