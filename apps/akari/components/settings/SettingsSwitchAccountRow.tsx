import { Pressable, StyleSheet, View } from 'react-native';

import { Image } from '@/components/Image';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { activeOpacity, fontSize, fontWeight, spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

type SettingsSwitchAccountRowProps = {
  iconColor: string;
  accentColor: string;
  cardBackground: string;
  otherAccountsCount: number;
  miniAccounts: { did: string; handle?: string; avatar?: string | null }[];
  accountProfiles: Record<string, { avatar?: string | null; displayName?: string | null } | undefined> | undefined;
  onAddAccount: () => void;
};

export function SettingsSwitchAccountRow({
  iconColor,
  accentColor,
  cardBackground,
  otherAccountsCount,
  miniAccounts,
  accountProfiles,
  onAddAccount,
}: SettingsSwitchAccountRowProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.switchRow}>
      <Pressable
        style={({ pressed }) => [styles.switchButton, pressed && { opacity: activeOpacity.default }]}
        onPress={onAddAccount}
      >
        <IconSymbol name="person.2.fill" size={20} color={iconColor} />
        <ThemedText style={styles.switchLabel}>
          {otherAccountsCount > 0 ? t('common.switchAccount') : t('common.addAccount')}
        </ThemedText>
      </Pressable>
      {miniAccounts.length > 0 ? (
        <View style={styles.miniAccounts}>
          {miniAccounts.map((acct, index) => {
            const mini = accountProfiles?.[acct.did];
            const miniAvatar = mini?.avatar ?? acct.avatar;
            const miniLetter = (mini?.displayName ?? acct.handle ?? '?')
              .charAt(0)
              .toUpperCase();
            return (
              <View
                key={acct.did}
                style={[
                  styles.miniAvatarWrap,
                  // Stack with a slight overlap, leftmost on top so the
                  // most recent (rightmost) sit underneath — matches the
                  // visual order of the design.
                  { zIndex: miniAccounts.length - index, marginLeft: index === 0 ? 0 : -8 },
                ]}
              >
                {miniAvatar ? (
                  <Image
                    contentFit="cover"
                    source={{ uri: miniAvatar }}
                    style={[styles.miniAvatar, { borderColor: cardBackground }]}
                  />
                ) : (
                  <View
                    style={[
                      styles.miniAvatar,
                      styles.miniAvatarFallback,
                      { backgroundColor: accentColor, borderColor: cardBackground },
                    ]}
                  >
                    <ThemedText style={styles.miniAvatarFallbackText}>{miniLetter}</ThemedText>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  switchLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  miniAccounts: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatarWrap: {
    width: 28,
    height: 28,
  },
  miniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
  },
  miniAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarFallbackText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
});
