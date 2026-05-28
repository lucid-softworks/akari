import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AvatarOrInitial } from '@/components/AvatarOrInitial';
import { Image } from '@/components/Image';
import { Dialog } from '@/components/ui/Dialog';
import { ThemedText } from '@/components/ThemedText';
import {
  activeOpacity,
  fontSize,
  fontWeight,
  layout,
  opacity,
  semanticColors,
  spacing,
} from '@/constants/tokens';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useNavigateToProfile } from '@/utils/navigation';

import type { AkariMembersData } from '@/hooks/queries/useAkariMembers';

type AkariMembersSheetProps = {
  members: AkariMembersData['members'];
  onClose: () => void;
};

/**
 * Sheet rendered when the user taps the small akari badge next to a
 * profile name. Shows a thank-you note and lists every account on
 * the curated list — each row navigates to the profile so the user
 * can poke around the community without leaving akari.
 */
export function AkariMembersSheet({ members, onClose }: AkariMembersSheetProps) {
  const borderColor = useBorderColor();
  const textColor = useThemeColor({}, 'text');
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const navigateToProfile = useNavigateToProfile();

  return (
    <Dialog onClose={onClose} nativePresentation="sheet">
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <View style={styles.headerButton} />
        <View style={styles.headerTitleWrap}>
          <Image
            source={require('@/assets/images/logo-classic.png')}
            style={styles.headerLogo}
            contentFit="contain"
            accessibilityLabel="akari"
          />
          <ThemedText style={[styles.headerTitle, { color: textColor }]}>
            {/* oxlint-disable-next-line i18next/no-literal-string -- brand sheet title, intentionally untranslated */}
            Thanks
          </ThemedText>
        </View>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.7 }]}
        >
          <ThemedText style={[styles.headerButtonText, { color: semanticColors.systemBlue }]}>
            {/* oxlint-disable-next-line i18next/no-literal-string -- brand sheet action, intentionally untranslated */}
            Done
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText style={[styles.intro, { color: subduedColor }]}>
          {/* oxlint-disable-next-line i18next/no-literal-string -- brand sheet copy, intentionally untranslated */}
          A standing thank you to the people on this list — early testers,
          contributors, translators, and friends who've helped shape akari.
          Tap a name to open their profile.
        </ThemedText>

        <View style={styles.members}>
          {members.map((member) => {
            const name = member.displayName || member.handle;
            return (
              <Pressable
                key={member.did}
                onPress={() => {
                  onClose();
                  navigateToProfile({ actor: member.handle });
                }}
                style={({ pressed }) => [
                  styles.memberRow,
                  { borderBottomColor: borderColor },
                  pressed && { opacity: activeOpacity.default },
                ]}
              >
                <AvatarOrInitial uri={member.avatar} seed={name} size={40} />
                <View style={styles.memberText}>
                  <ThemedText
                    style={[styles.memberName, { color: textColor }]}
                    numberOfLines={1}
                  >
                    {name}
                  </ThemedText>
                  <ThemedText
                    style={[styles.memberHandle, { color: subduedColor }]}
                    numberOfLines={1}
                  >
                    @{member.handle}
                  </ThemedText>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: layout.hairline,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerLogo: {
    width: 22,
    height: 22,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  headerButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minWidth: 64,
    alignItems: 'flex-end',
  },
  headerButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  intro: {
    fontSize: fontSize.base,
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  members: {
    paddingHorizontal: spacing.lg,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
  },
  memberText: {
    flex: 1,
    minWidth: 0,
  },
  memberName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  memberHandle: {
    fontSize: fontSize.base,
    opacity: opacity.secondary,
  },
});
