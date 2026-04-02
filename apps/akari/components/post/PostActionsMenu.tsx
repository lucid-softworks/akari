import React, { useCallback, useMemo } from 'react';
import { Dimensions, Modal, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type PostMenuItem =
  | { key: string; label: string; onPress: () => void; destructive?: boolean; disabled?: boolean }
  | { key: string; type: 'separator' };

type PostActionsMenuProps = {
  visible: boolean;
  menuPosition: { x: number; y: number; width: number; height: number } | null;
  canTranslate: boolean;
  onDismiss: () => void;
  onTranslatePress: () => void;
};

export const PostActionsMenu = React.memo(function PostActionsMenu({
  visible,
  menuPosition,
  canTranslate,
  onDismiss,
  onTranslatePress,
}: PostActionsMenuProps) {
  const { t } = useTranslation();

  const menuBackgroundColor = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const borderColor = useThemeColor({ light: '#e8eaed', dark: '#2d3133' }, 'background');
  const dividerColor = useThemeColor({ light: 'rgba(0, 0, 0, 0.08)', dark: 'rgba(255, 255, 255, 0.16)' }, 'background');

  const handlePlaceholderAction = useCallback(
    (actionKey: string) => {
      onDismiss();
      if (__DEV__) {
        console.info(`[PostCard] Action "${actionKey}" is not implemented yet.`);
      }
    },
    [onDismiss],
  );

  const menuStyle = useMemo(() => {
    if (!menuPosition) return { top: 16, right: 16 };

    const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
    const estimatedHeight = 440;

    let top = menuPosition.y + menuPosition.height + 4;
    if (top + estimatedHeight > windowHeight) {
      top = Math.max(16, menuPosition.y - estimatedHeight);
    }

    const right = Math.max(8, windowWidth - (menuPosition.x + menuPosition.width));
    return { top, right };
  }, [menuPosition]);

  const menuActions = useMemo<PostMenuItem[]>(
    () => [
      { key: 'translate', label: t('post.actions.translate'), onPress: onTranslatePress, disabled: !canTranslate },
      { key: 'copyText', label: t('post.actions.copyText'), onPress: () => handlePlaceholderAction('copyText') },
      { key: 'separator-1', type: 'separator' },
      { key: 'showMoreLikeThis', label: t('post.actions.showMoreLikeThis'), onPress: () => handlePlaceholderAction('showMoreLikeThis') },
      { key: 'showLessLikeThis', label: t('post.actions.showLessLikeThis'), onPress: () => handlePlaceholderAction('showLessLikeThis') },
      { key: 'assignToLists', label: t('post.actions.assignToLists'), onPress: () => handlePlaceholderAction('assignToLists') },
      { key: 'separator-2', type: 'separator' },
      { key: 'muteThread', label: t('post.actions.muteThread'), onPress: () => handlePlaceholderAction('muteThread') },
      { key: 'muteWordsAndTags', label: t('post.actions.muteWordsAndTags'), onPress: () => handlePlaceholderAction('muteWordsAndTags') },
      { key: 'separator-3', type: 'separator' },
      { key: 'hidePost', label: t('post.actions.hidePost'), onPress: () => handlePlaceholderAction('hidePost') },
      { key: 'hideAccount', label: t('post.actions.hideAccount'), onPress: () => handlePlaceholderAction('hideAccount') },
      { key: 'separator-4', type: 'separator' },
      { key: 'muteAccount', label: t('profile.muteAccount'), onPress: () => handlePlaceholderAction('muteAccount') },
      { key: 'blockAccount', label: t('common.block'), onPress: () => handlePlaceholderAction('blockAccount'), destructive: true },
      { key: 'reportAccount', label: t('profile.reportAccount'), onPress: () => handlePlaceholderAction('reportAccount'), destructive: true },
    ],
    [canTranslate, handlePlaceholderAction, onTranslatePress, t],
  );

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onDismiss}>
      {visible && (
        <TouchableWithoutFeedback onPress={onDismiss}>
          <View style={styles.menuOverlay}>
            <TouchableWithoutFeedback>
              <ThemedView
                style={[styles.menuContainer, menuStyle, { backgroundColor: menuBackgroundColor, borderColor }]}
                accessibilityRole="menu"
              >
                {menuActions.map((item) => {
                  if ('type' in item) {
                    return <View key={item.key} style={[styles.menuSeparator, { borderColor: dividerColor }]} />;
                  }
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={styles.menuItem}
                      onPress={item.disabled ? undefined : item.onPress}
                      disabled={item.disabled}
                      accessibilityRole="menuitem"
                      accessibilityState={{ disabled: item.disabled }}
                      activeOpacity={item.disabled ? 1 : 0.7}
                    >
                      <ThemedText
                        style={[
                          styles.menuItemText,
                          item.destructive && styles.menuItemTextDestructive,
                          item.disabled && styles.menuItemTextDisabled,
                        ]}
                      >
                        {item.label}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </ThemedView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      )}
    </Modal>
  );
});

const styles = StyleSheet.create({
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  menuContainer: {
    position: 'absolute',
    borderWidth: 1,
    minWidth: 220,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemText: {
    fontSize: 14,
  },
  menuItemTextDestructive: {
    color: '#d13232',
  },
  menuItemTextDisabled: {
    opacity: 0.5,
  },
  menuSeparator: {
    borderTopWidth: 1,
    marginVertical: 4,
  },
});
