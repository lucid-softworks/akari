import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { Image } from '@/components/Image';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { fontSize, fontWeight, radius, spacing, touchTarget } from '@/constants/tokens';

type ConvoMemberLite = {
  did?: string;
  handle?: string;
  displayName?: string;
};

type MessageThreadConvo = {
  avatar?: string;
  displayName?: string;
  handle: string;
  isGroup: boolean;
  members: ConvoMemberLite[];
};

type MobileTabHeaderProps = {
  headerTitle: string;
  isNestedRoute: boolean;
  isMessageThread: boolean;
  messageThreadConvo?: MessageThreadConvo;
  safeAreaTop: number;
  headerBackground: string;
  headerBorderColor: string;
  headerIconColor: string;
  headerTextColor: string;
  onBackPress: () => void;
  onChatOptionsPress: () => void;
};

export function MobileTabHeader({
  headerTitle,
  isNestedRoute,
  isMessageThread,
  messageThreadConvo,
  safeAreaTop,
  headerBackground,
  headerBorderColor,
  headerIconColor,
  headerTextColor,
  onBackPress,
  onChatOptionsPress,
}: MobileTabHeaderProps) {
  return (
    <View
      style={[
        styles.header,
        {
          // The `+6` here used to give a touch of extra breathing room
          // above the title row, but on Android with edge-to-edge +
          // display cutout `safeAreaInsets.top` already covers both
          // the status bar AND the cutout, so the extra dp pile up
          // visibly. The button row has its own ~44dp height, that's
          // plenty of vertical space without padding past the inset.
          paddingTop: safeAreaTop,
          backgroundColor: headerBackground,
          borderBottomColor: headerBorderColor,
        },
      ]}
    >
      {isNestedRoute ? (
        <HapticTab
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBackPress}
          style={styles.headerButton}
        >
          <IconSymbol name="chevron.left" color={headerIconColor} size={22} />
        </HapticTab>
      ) : (
        <View style={styles.headerButton} />
      )}
      <View style={styles.headerContent}>
        {isMessageThread && messageThreadConvo ? (
          <>
            {messageThreadConvo.avatar ? (
              <Image source={{ uri: messageThreadConvo.avatar }} style={styles.headerConvoAvatar} />
            ) : null}
            <View style={styles.headerConvoInfo}>
              <Text style={[styles.headerTitle, { color: headerTextColor }]} numberOfLines={1}>
                {messageThreadConvo.isGroup
                  ? messageThreadConvo.members.map((m) => m.displayName || m.handle).join(', ')
                  : messageThreadConvo.displayName || messageThreadConvo.handle}
              </Text>
              {!messageThreadConvo.isGroup ? (
                <Text style={[styles.headerConvoHandle, { color: headerTextColor }]} numberOfLines={1}>
                  @{messageThreadConvo.handle}
                </Text>
              ) : null}
            </View>
          </>
        ) : (
          <>
            {headerTitle ? (
              <Text style={[styles.headerTitle, { color: headerTextColor }]} numberOfLines={1}>
                {headerTitle}
              </Text>
            ) : null}
          </>
        )}
      </View>
      {isMessageThread && messageThreadConvo ? (
        <HapticTab
          accessibilityRole="button"
          accessibilityLabel="Chat options"
          onPress={onChatOptionsPress}
          style={styles.headerButton}
        >
          <IconSymbol name="ellipsis" color={headerIconColor} size={22} />
        </HapticTab>
      ) : (
        <View style={styles.headerSpacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: touchTarget.min,
    height: touchTarget.min,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerConvoAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: spacing.sm,
  },
  headerConvoInfo: {
    flex: 1,
  },
  headerConvoHandle: {
    fontSize: fontSize.sm,
    opacity: 0.5,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
  },
  headerSpacer: {
    width: touchTarget.min,
    height: touchTarget.min,
  },
});
