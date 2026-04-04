import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, radius, fontSize, fontWeight, opacity, activeOpacity, semanticColors, layout } from '@/constants/tokens';
import { ReportSheet } from '@/components/ReportSheet';
import { useMuteUser } from '@/hooks/mutations/useMuteUser';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type PostMenuItem = {
  key: string;
  label: string;
  icon: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

type PostActionsMenuProps = {
  visible: boolean;
  canTranslate: boolean;
  postText?: string;
  postUri?: string;
  postCid?: string;
  authorDid?: string;
  onDismiss: () => void;
  onTranslatePress: () => void;
};

export const PostActionsMenu = React.memo(function PostActionsMenu({
  visible,
  canTranslate,
  postText,
  postUri,
  postCid,
  authorDid,
  onDismiss,
  onTranslatePress,
}: PostActionsMenuProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [showReportSheet, setShowReportSheet] = useState(false);

  const menuBackgroundColor = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const handleBarColor = useThemeColor({ light: '#d1d1d6', dark: '#3a3a3c' }, 'border');
  const iconColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'text');

  const muteMutation = useMuteUser();

  const handleCopyText = useCallback(() => {
    if (postText) {
      void Clipboard.setStringAsync(postText);
    }
    onDismiss();
  }, [postText, onDismiss]);

  const handleMuteAccount = useCallback(() => {
    if (authorDid) {
      muteMutation.mutate({ actor: authorDid, action: 'mute' });
    }
    onDismiss();
  }, [authorDid, muteMutation, onDismiss]);

  const menuActions = useMemo<PostMenuItem[]>(
    () => [
      { key: 'translate', icon: 'character.book.closed', label: t('post.actions.translate'), onPress: onTranslatePress, disabled: !canTranslate },
      { key: 'copyText', icon: 'doc.on.doc', label: t('post.actions.copyText'), onPress: handleCopyText, disabled: !postText },
      { key: 'muteAccount', icon: 'speaker.slash', label: t('profile.muteAccount'), onPress: handleMuteAccount, disabled: !authorDid },
      { key: 'reportPost', icon: 'exclamationmark.triangle', label: t('profile.reportAccount'), onPress: () => { onDismiss(); setShowReportSheet(true); }, destructive: true },
    ],
    [canTranslate, postText, authorDid, handleCopyText, handleMuteAccount, onTranslatePress, onDismiss, t],
  );

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onDismiss}>
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <ThemedView
              style={[
                styles.sheet,
                {
                  backgroundColor: menuBackgroundColor,
                  paddingBottom: insets.bottom + spacing.lg,
                },
              ]}
            >
              {/* Handle bar */}
              <View style={styles.handleBarContainer}>
                <View style={[styles.handleBar, { backgroundColor: handleBarColor }]} />
              </View>

              <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {menuActions.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={styles.menuItem}
                    onPress={item.disabled ? undefined : item.onPress}
                    disabled={item.disabled}
                    accessibilityRole="menuitem"
                    accessibilityState={{ disabled: item.disabled }}
                    activeOpacity={item.disabled ? 1 : activeOpacity.default}
                  >
                    <IconSymbol
                      name={item.icon as any}
                      size={20}
                      color={item.destructive ? semanticColors.danger : item.disabled ? iconColor : iconColor}
                      style={[styles.menuItemIcon, item.disabled && styles.menuItemDisabled]}
                    />
                    <ThemedText
                      style={[
                        styles.menuItemText,
                        item.destructive && styles.menuItemTextDestructive,
                        item.disabled && styles.menuItemDisabled,
                      ]}
                    >
                      {item.label}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Cancel button */}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onDismiss}
                activeOpacity={activeOpacity.default}
              >
                <ThemedText style={styles.cancelText}>{t('common.cancel')}</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>

      <ReportSheet
        visible={showReportSheet}
        onDismiss={() => setShowReportSheet(false)}
        subject={postUri && postCid ? { type: 'post', uri: postUri, cid: postCid } : authorDid ? { type: 'account', did: authorDid } : null}
      />
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '70%',
  },
  handleBarContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
  },
  scrollView: {
    paddingHorizontal: spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  menuItemIcon: {},
  menuItemText: {
    fontSize: fontSize.lg,
    flex: 1,
  },
  menuItemTextDestructive: {
    color: semanticColors.danger,
  },
  menuItemDisabled: {
    opacity: opacity.disabled,
  },
  cancelButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderTopWidth: layout.hairline,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  cancelText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
});
