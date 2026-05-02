import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, radius, fontSize, fontWeight, opacity, activeOpacity, semanticColors, layout } from '@/constants/tokens';
import { ReportSheet } from '@/components/ReportSheet';
import { useToast } from '@/contexts/ToastContext';
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

// Global ref to dismiss any currently open menu when a new one opens
let activeMenuDismiss: (() => void) | null = null;

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
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const [showReportSheet, setShowReportSheet] = useState(false);

  // On web, close the dropdown when clicking anywhere or when another menu opens
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;

    // Dismiss any previously open menu
    if (activeMenuDismiss && activeMenuDismiss !== onDismiss) {
      activeMenuDismiss();
    }
    activeMenuDismiss = onDismiss;

    const handler = () => {
      if (activeMenuDismiss === onDismiss) activeMenuDismiss = null;
      onDismiss();
    };
    const id = requestAnimationFrame(() => window.addEventListener('click', handler, { once: true }));
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('click', handler);
      if (activeMenuDismiss === onDismiss) activeMenuDismiss = null;
    };
  }, [visible, onDismiss]);

  const menuBackgroundColor = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const handleBarColor = useThemeColor({ light: '#d1d1d6', dark: '#3a3a3c' }, 'border');
  const iconColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'text');

  const muteMutation = useMuteUser();

  const handleCopyText = useCallback(() => {
    if (postText) {
      void Clipboard.setStringAsync(postText).then(() => {
        showToast({ message: t('common.copiedToClipboard'), type: 'success' });
      });
    }
    onDismiss();
  }, [postText, onDismiss, showToast, t]);

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

  const wrapPress = Platform.OS === 'web'
    ? (handler: (() => void) | undefined) => (e: any) => { e?.stopPropagation?.(); e?.preventDefault?.(); handler?.(); }
    : (handler: (() => void) | undefined) => handler;

  const menuItems = menuActions.map((item) => (
    <TouchableOpacity
      key={item.key}
      style={styles.menuItem}
      onPress={item.disabled ? undefined : wrapPress(item.onPress)}
      disabled={item.disabled}
      accessibilityRole="menuitem"
      accessibilityState={{ disabled: item.disabled }}
      activeOpacity={item.disabled ? 1 : activeOpacity.default}
    >
      <IconSymbol
        name={item.icon as any}
        size={20}
        color={item.destructive ? semanticColors.danger : iconColor}
        style={item.disabled ? styles.menuItemDisabled : undefined}
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
  ));

  return (
    <>
    {Platform.OS === 'web' ? (
      visible ? (
          <ThemedView
            style={[styles.webDropdown, { backgroundColor: menuBackgroundColor, borderColor: handleBarColor }]}
            {...{ onClick: (e: any) => e.stopPropagation() }}
          >
            {menuItems}
          </ThemedView>
      ) : null
    ) : (
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onDismiss}
      >
        <Pressable style={styles.backdrop} onPress={onDismiss}>
          <View />
        </Pressable>
        <View pointerEvents="box-none" style={styles.sheetWrap}>
          <ThemedView
            style={[
              styles.sheet,
              {
                backgroundColor: menuBackgroundColor,
                paddingBottom: insets.bottom + spacing.md,
              },
            ]}
          >
            <View style={styles.handleBarContainer}>
              <View style={[styles.handleBar, { backgroundColor: handleBarColor }]} />
            </View>
            <View style={styles.menuItems}>{menuItems}</View>
            <TouchableOpacity
              style={[styles.cancelButton, { borderTopColor: handleBarColor }]}
              onPress={onDismiss}
              activeOpacity={activeOpacity.default}
            >
              <ThemedText style={styles.cancelText}>{t('common.cancel')}</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>
    )}
    <ReportSheet
      visible={showReportSheet}
      onDismiss={() => setShowReportSheet(false)}
      subject={postUri && postCid ? { type: 'post', uri: postUri, cid: postCid } : authorDid ? { type: 'account', did: authorDid } : null}
    />
    </>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheetWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.xs,
  },
  handleBarContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: radius.full,
    opacity: 0.5,
  },
  menuItems: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
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
  webDropdown: {
    position: 'absolute' as any,
    right: 0,
    bottom: 40,
    zIndex: 9999,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
});
