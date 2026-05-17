import { Pressable, StyleSheet } from 'react-native';

import { Image } from '@/components/Image';
import { Labels } from '@/components/Labels';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { VerificationBadge } from '@/components/VerificationBadge';
import { activeOpacity, fontSize, fontWeight, layout, opacity, spacing } from '@/constants/tokens';

export type SearchProfileResultProps = {
  profile: {
    handle: string;
    displayName?: string;
    avatar?: string;
    description?: string;
    labels?: unknown;
    verification?: unknown;
  };
  borderColor: string;
  textColor: string;
  onPress: () => void;
};

export function SearchProfileResult({
  profile,
  borderColor,
  textColor,
  onPress,
}: SearchProfileResultProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.resultItem,
        { borderBottomColor: borderColor },
        pressed && { opacity: activeOpacity.default },
      ]}
      onPress={onPress}
    >
      <ThemedView style={styles.profileContainer}>
        {profile.avatar ? (
          <Image
            source={{ uri: profile.avatar }}
            style={styles.profileAvatar}
            contentFit="cover"
          />
        ) : null}
        <ThemedView style={styles.profileInfo}>
          <ThemedView style={styles.displayNameRow}>
            <ThemedText style={[styles.displayName, { color: textColor }]} numberOfLines={1}>
              {profile.displayName || profile.handle}
            </ThemedText>
            <VerificationBadge
              verification={profile.verification as never}
              subjectHandle={profile.handle}
              subjectDisplayName={profile.displayName}
              size={fontSize.lg}
            />
          </ThemedView>
          <ThemedText style={[styles.handle, { color: textColor }]}>@{profile.handle}</ThemedText>
          {profile.description ? (
            <ThemedText style={[styles.description, { color: textColor }]} numberOfLines={2}>
              {profile.description}
            </ThemedText>
          ) : null}
          <Labels labels={profile.labels as never} maxLabels={3} />
        </ThemedView>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  resultItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  profileInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  displayNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  displayName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    flexShrink: 1,
  },
  handle: {
    fontSize: fontSize.base,
    opacity: opacity.secondary,
  },
  description: {
    fontSize: fontSize.base,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
});
