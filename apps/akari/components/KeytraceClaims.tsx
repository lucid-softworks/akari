import React from 'react';
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, fontSize, fontWeight, radius, activeOpacity } from '@/constants/tokens';
import { useKeytraceClaims } from '@/hooks/queries/useKeytraceClaims';
import { useThemeColor } from '@/hooks/useThemeColor';

const CLAIM_ICONS: Record<string, React.ComponentProps<typeof IconSymbol>['name']> = {
  github: 'chevron.left.forwardslash.chevron.right',
  dns: 'globe',
  linkedin: 'person.crop.rectangle',
  instagram: 'camera',
  hackernews: 'newspaper',
  mastodon: 'bubble.left',
  twitter: 'at',
  npm: 'shippingbox',
  bluesky: 'cloud',
};

type KeytraceClaimsProps = {
  handle?: string;
};

export function KeytraceClaims({ handle }: KeytraceClaimsProps) {
  const { data } = useKeytraceClaims(handle);

  const verifiedColor = useThemeColor({ light: '#16a34a', dark: '#4ade80' }, 'text');
  const secondaryColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const chipBg = useThemeColor({ light: '#f0fdf4', dark: 'rgba(74, 222, 128, 0.1)' }, 'background');
  const chipBorder = useThemeColor({ light: '#bbf7d0', dark: 'rgba(74, 222, 128, 0.2)' }, 'border');

  if (!data || data.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconSymbol name="checkmark.seal.fill" size={14} color={verifiedColor} />
        <ThemedText style={[styles.headerText, { color: secondaryColor }]}>
          Verified identities
        </ThemedText>
      </View>
      <View style={styles.claims}>
        {data.map((claim) => (
          <TouchableOpacity
            key={claim.rkey}
            style={[styles.chip, { backgroundColor: chipBg, borderColor: chipBorder }]}
            onPress={() => {
              if (claim.claimUri) {
                void Linking.openURL(claim.claimUri);
              }
            }}
            activeOpacity={activeOpacity.default}
          >
            <IconSymbol
              name={CLAIM_ICONS[claim.type] ?? 'link'}
              size={13}
              color={verifiedColor}
            />
            <ThemedText style={styles.claimText} numberOfLines={1}>
              {claim.identity.displayName || claim.identity.subject}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  claims: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.xs,
    borderWidth: 1,
  },
  claimText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    maxWidth: 160,
  },
});
