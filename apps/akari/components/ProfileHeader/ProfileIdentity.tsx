import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { VerificationBadge } from '@/components/VerificationBadge';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { activeOpacity, fontSize, fontWeight, hitSlop, opacity, spacing } from '@/constants/tokens';
import type { BlueskyVerification } from '@/bluesky-api';

type ProfileIdentityProps = {
  displayName?: string;
  handle: string;
  did?: string;
  verification?: BlueskyVerification;
  pronouns?: string;
  onHandlePress: () => void;
};

export function ProfileIdentity({
  displayName,
  handle,
  did,
  verification,
  pronouns,
  onHandlePress,
}: ProfileIdentityProps) {
  return (
    <View style={styles.nameHandleSection}>
      <View style={styles.displayNameRow}>
        <ThemedText style={styles.displayName}>{displayName || handle}</ThemedText>
        <VerificationBadge
          subjectDid={did}
          verification={verification}
          subjectHandle={handle}
          subjectDisplayName={displayName}
          size={20}
        />
      </View>
      <View style={styles.handleRow}>
        <Pressable
          style={({ pressed }) => [styles.handleContainer, pressed && { opacity: activeOpacity.default }]}
          onPress={onHandlePress}
          hitSlop={hitSlop}
        >
          <ThemedText style={styles.handle}>@{handle}</ThemedText>
          <IconSymbol name="clock" size={fontSize.base} color="#666" style={styles.handleHistoryIcon} />
        </Pressable>
        {pronouns ? (
          <>
            <ThemedText style={styles.pronounsSeparator}>·</ThemedText>
            <ThemedText style={styles.pronouns} numberOfLines={1}>{pronouns}</ThemedText>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nameHandleSection: {
    flex: 1,
    marginRight: spacing.sm + spacing.xxs,
  },
  displayNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xxs,
  },
  displayName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    flexShrink: 1,
  },
  handle: {
    fontSize: 15,
    opacity: opacity.secondary,
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  handleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pronounsSeparator: {
    fontSize: 15,
    opacity: opacity.tertiary,
  },
  pronouns: {
    fontSize: 15,
    opacity: opacity.secondary,
    flexShrink: 1,
  },
  handleHistoryIcon: {
    marginLeft: spacing.sm - spacing.xxs,
    opacity: opacity.tertiary,
  },
});
