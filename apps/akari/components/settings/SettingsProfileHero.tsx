import { Pressable, StyleSheet, View } from 'react-native';

import { Image } from '@/components/Image';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { activeOpacity, fontSize, fontWeight, spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

type SettingsProfileHeroProps = {
  isGuest: boolean;
  accentColor: string;
  secondaryText: string;
  avatar: string | null;
  fallbackLetter: string;
  displayName: string | null;
  handle: string | undefined;
  onPress: () => void;
};

export function SettingsProfileHero({
  isGuest,
  accentColor,
  secondaryText,
  avatar,
  fallbackLetter,
  displayName,
  handle,
  onPress,
}: SettingsProfileHeroProps) {
  const { t } = useTranslation();
  return (
    <Pressable
      style={({ pressed }) => [styles.hero, pressed && { opacity: activeOpacity.subtle }]}
      onPress={onPress}
    >
      {isGuest ? (
        <View style={[styles.heroAvatar, styles.heroAvatarFallback, { backgroundColor: accentColor }]}>
          <IconSymbol name="person.fill" size={36} color="#ffffff" />
        </View>
      ) : avatar ? (
        <Image contentFit="cover" source={{ uri: avatar }} style={styles.heroAvatar} />
      ) : (
        <View style={[styles.heroAvatar, styles.heroAvatarFallback, { backgroundColor: accentColor }]}>
          <ThemedText style={styles.heroAvatarFallbackText}>{fallbackLetter}</ThemedText>
        </View>
      )}
      {isGuest ? (
        <>
          <ThemedText style={styles.heroDisplayName}>{t('auth.guestHeroTitle')}</ThemedText>
          <ThemedText style={[styles.heroHandle, { color: secondaryText }]}>
            {t('auth.signInCta')}
          </ThemedText>
        </>
      ) : (
        <>
          {displayName ? <ThemedText style={styles.heroDisplayName}>{displayName}</ThemedText> : null}
          {handle ? (
            <ThemedText style={[styles.heroHandle, { color: secondaryText }]}>
              @{handle}
            </ThemedText>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  heroAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: spacing.md,
  },
  heroAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarFallbackText: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  heroDisplayName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  heroHandle: {
    fontSize: fontSize.base,
    textAlign: 'center',
  },
});
