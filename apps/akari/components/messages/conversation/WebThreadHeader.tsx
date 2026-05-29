import { Pressable, StyleSheet, View } from 'react-native';

import { AvatarOrInitial } from '@/components/AvatarOrInitial';
import { ThemedText } from '@/components/ThemedText';
import { VerificationBadge } from '@/components/VerificationBadge';
import { IconSymbol } from '@/components/ui/IconSymbol';
import type { Conversation } from '@/components/messages/types';
import { activeOpacity, fontSize, fontWeight, layout, opacity, radius, spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

type WebThreadHeaderProps = {
  conversation: Conversation;
  title: string;
  handle: string | null;
  avatar: string | undefined;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
  onOptionsPress: () => void;
};

/**
 * Sticky chat-thread header for web large-screen, where the `(tabs)`
 * layout's MobileTabHeader doesn't render. Shows the peer/group name,
 * handle, avatar, and an options button. Native and mobile-web are
 * already covered by MobileTabHeader.
 */
export function WebThreadHeader({
  conversation,
  title,
  handle,
  avatar,
  backgroundColor,
  borderColor,
  textColor,
  iconColor,
  onOptionsPress,
}: WebThreadHeaderProps) {
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.webThreadHeader,
        {
          backgroundColor,
          borderBottomColor: borderColor,
        },
      ]}
    >
      <AvatarOrInitial uri={avatar} seed={title || handle || '?'} size={32} />
      <View style={styles.webThreadHeaderText}>
        <View style={styles.webThreadHeaderTitleRow}>
          <ThemedText
            style={[styles.webThreadHeaderTitle, { color: textColor }]}
            numberOfLines={1}
          >
            {title}
          </ThemedText>
          {!conversation.isGroup && conversation.members[0]?.did ? (
            <VerificationBadge
              subjectDid={conversation.members[0].did}
              verification={conversation.verification}
              subjectHandle={conversation.handle}
              subjectDisplayName={conversation.displayName}
              size={fontSize.base}
            />
          ) : null}
        </View>
        {handle ? (
          <ThemedText
            style={[styles.webThreadHeaderHandle, { color: textColor }]}
            numberOfLines={1}
          >
            @{handle}
          </ThemedText>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('navigation.settings')}
        onPress={onOptionsPress}
        style={({ pressed }) => [
          styles.webThreadHeaderButton,
          pressed && { opacity: activeOpacity.default },
        ]}
      >
        <IconSymbol name="ellipsis" color={iconColor} size={20} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // `position: sticky` is web-only; RN's StyleSheet types it as
  // `absolute | relative | fixed`, so we have to cast through `object`
  // the same way the home tab's sticky tabs strip does. `top: 0` is
  // relative to the nearest scroll context — for the chat thread on
  // web, that's the document body (the WebTabLayout content View is
  // `overflow: visible`), which is exactly what we want.
  webThreadHeader: ({
    position: 'sticky',
    top: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
  } as object),
  webThreadHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  webThreadHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    flexShrink: 1,
  },
  webThreadHeaderTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    flexShrink: 1,
  },
  webThreadHeaderHandle: {
    fontSize: fontSize.sm,
    opacity: opacity.secondary,
  },
  webThreadHeaderButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
