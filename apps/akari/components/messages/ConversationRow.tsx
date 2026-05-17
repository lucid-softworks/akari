import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Image } from '@/components/Image';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { VerificationBadge } from '@/components/VerificationBadge';
import type { Conversation } from '@/components/messages/types';
import { activeOpacity, fontSize, fontWeight, layout, opacity, radius, spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';
import { useNavigateToProfile } from '@/utils/navigation';

type ConversationRowProps = {
  conversation: Conversation;
  borderColor: string;
};

export function ConversationRow({ conversation, borderColor }: ConversationRowProps) {
  const { t } = useTranslation();
  const navigateToProfile = useNavigateToProfile();

  const isDeleted = conversation.handle === 'missing.invalid';
  const displayName = conversation.isGroup
    ? conversation.members
        .map((m) => m.displayName || m.handle || t('messages.deletedAccount'))
        .join(', ')
    : isDeleted
      ? t('messages.deletedAccount')
      : conversation.displayName;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.conversationItem,
        { borderBottomColor: borderColor },
        pressed && { opacity: 0.7 },
      ]}
      onPress={() => {
        router.push(
          `/(tabs)/messages/${encodeURIComponent(conversation.convoId)}?handle=${encodeURIComponent(conversation.handle)}` as any,
        );
      }}
    >
      <ThemedView style={styles.conversationContent}>
        <Pressable
          style={({ pressed }) => [styles.avatarContainer, pressed && { opacity: activeOpacity.default }]}
          onPress={() => {
            if (isDeleted || conversation.isGroup) return;
            navigateToProfile({ actor: conversation.handle });
          }}
        >
          {conversation.isGroup ? (
            <View style={styles.groupAvatar}>
              {conversation.members.slice(0, 3).map((member, idx) => (
                <ThemedView
                  key={member.did}
                  style={[
                    styles.groupAvatarSlot,
                    { borderColor },
                    idx > 0 && styles.groupAvatarSlotOverlap,
                  ]}
                >
                  {member.avatar ? (
                    <Image source={{ uri: member.avatar }} style={styles.groupAvatarImage} contentFit="cover" />
                  ) : (
                    <ThemedText style={styles.groupAvatarFallback}>
                      {(member.displayName || member.handle || 'U')[0].toUpperCase()}
                    </ThemedText>
                  )}
                </ThemedView>
              ))}
            </View>
          ) : conversation.avatar ? (
            <ThemedView style={styles.avatar}>
              <Image source={{ uri: conversation.avatar }} style={styles.avatarImage} contentFit="cover" />
            </ThemedView>
          ) : (
            <ThemedView style={styles.avatar}>
              <ThemedText style={styles.avatarFallback}>{(displayName || 'U')[0].toUpperCase()}</ThemedText>
            </ThemedView>
          )}
        </Pressable>

        <ThemedView style={styles.conversationInfo}>
          <ThemedView style={styles.conversationHeader}>
            <ThemedView style={styles.displayNameRow}>
              <ThemedText
                style={[styles.displayName, conversation.unreadCount > 0 && styles.displayNameUnread]}
                numberOfLines={1}
              >
                {displayName}
              </ThemedText>
              {!conversation.isGroup ? (
                <VerificationBadge
                  verification={conversation.verification}
                  subjectHandle={conversation.handle}
                  subjectDisplayName={conversation.displayName}
                  size={fontSize.base}
                />
              ) : null}
            </ThemedView>
            <ThemedText style={styles.timestamp}>{conversation.timestamp}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.conversationFooter}>
            <ThemedText
              style={[styles.lastMessage, conversation.unreadCount > 0 && styles.lastMessageUnread]}
              numberOfLines={1}
            >
              {conversation.lastMessage}
            </ThemedText>
            {conversation.unreadCount > 0 && (
              <ThemedView style={styles.unreadBadge}>
                <ThemedText style={styles.unreadCount}>
                  {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                </ThemedText>
              </ThemedView>
            )}
          </ThemedView>
          {conversation.status === 'request' && (
            <ThemedView style={styles.statusBadge}>
              <ThemedText style={styles.statusText}>{t('common.pending')}</ThemedText>
            </ThemedView>
          )}
        </ThemedView>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  conversationItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
  },
  conversationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarFallback: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: 'white',
  },
  groupAvatar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 50,
    height: 50,
  },
  groupAvatarSlot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
  },
  groupAvatarSlotOverlap: {
    marginLeft: -spacing.md,
  },
  groupAvatarImage: {
    width: '100%',
    height: '100%',
  },
  groupAvatarFallback: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  displayNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    flex: 1,
    marginRight: spacing.sm,
  },
  displayName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    flexShrink: 1,
  },
  displayNameUnread: {
    fontWeight: fontWeight.bold,
  },
  timestamp: {
    fontSize: fontSize.sm,
    opacity: opacity.tertiary,
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: fontSize.base,
    opacity: opacity.secondary,
    flex: 1,
    marginRight: spacing.sm,
  },
  lastMessageUnread: {
    opacity: 1,
    fontWeight: fontWeight.medium,
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: 'white',
  },
  statusBadge: {
    backgroundColor: '#FF9500',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  statusText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    color: 'white',
  },
});
