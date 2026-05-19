import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import {
  activeOpacity,
  fontSize,
  fontWeight,
  layout,
  radius,
  spacing,
} from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

const ADULT_LABEL_KEYS = new Set(['porn', 'sexual', 'nudity', 'graphic-media']);

type AdultContentGateProps = {
  /** Triggering label values (e.g. ['nudity', 'sexual']). */
  matchedLabels: readonly string[];
  children: React.ReactNode;
};

/**
 * Wraps a post body. When the user has adult content enabled but the
 * post carries one of the four adult labels, render a placeholder card
 * the user can tap to reveal. When the user has it disabled, the parent
 * component should suppress the post entirely; this gate does not handle
 * the `'hide'` decision.
 */
export function AdultContentGate({ matchedLabels, children }: AdultContentGateProps) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);
  const borderColor = useThemeColor({ light: '#e8eaed', dark: '#2d3133' }, 'background');
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const tintBackground = useThemeColor({ light: '#F3F4F6', dark: '#1c1c1e' }, 'background');

  const labelText = useMemo(() => {
    return matchedLabels
      .map((value) =>
        ADULT_LABEL_KEYS.has(value)
          ? t(`settings.adultLabel.${value}` as 'settings.adultLabel.porn')
          : value,
      )
      .join(', ');
  }, [matchedLabels, t]);

  // The gate is reused for any content-label warn — pick a generic title
  // unless every matched label is in the adult set, in which case the
  // existing "Adult content" copy is more specific and reads better.
  const isAdultOnly =
    matchedLabels.length > 0 &&
    matchedLabels.every((value) => ADULT_LABEL_KEYS.has(value));
  const gateTitle = isAdultOnly
    ? t('settings.adultContentWarnTitle')
    : t('post.labelGateTitle');

  if (revealed) {
    return (
      <View>
        {children}
        <Pressable
          onPress={(event: { stopPropagation?: () => void }) => {
            event?.stopPropagation?.();
            setRevealed(false);
          }}
          accessibilityRole="button"
          accessibilityLabel={t('settings.adultContentHide')}
          style={({ pressed }) => [
            styles.hideAgainButton,
            { borderColor },
            pressed && { opacity: activeOpacity.default },
          ]}
        >
          <IconSymbol name="eye.slash.fill" size={14} color={subduedColor} />
          <ThemedText style={[styles.hideAgainText, { color: subduedColor }]}>
            {t('settings.adultContentHide')}
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <ThemedView
      style={[
        styles.gateCard,
        { borderColor, backgroundColor: tintBackground },
      ]}
    >
      <View style={styles.gateHeader}>
        <IconSymbol name="exclamationmark.triangle.fill" size={20} color={accentColor} />
        <ThemedText style={styles.gateTitle}>{gateTitle}</ThemedText>
      </View>
      <ThemedText style={[styles.gateSubtitle, { color: subduedColor }]}>
        {t('settings.adultContentWarnSubtitle', { labels: labelText })}
      </ThemedText>
      <Pressable
        onPress={(event: { stopPropagation?: () => void }) => {
          event?.stopPropagation?.();
          setRevealed(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={t('settings.adultContentShow')}
        style={({ pressed }) => [
          styles.revealButton,
          { backgroundColor: accentColor },
          pressed && { opacity: activeOpacity.default },
        ]}
      >
        <ThemedText style={styles.revealButtonText}>{t('settings.adultContentShow')}</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  gateCard: {
    marginVertical: spacing.sm,
    padding: spacing.md,
    borderWidth: layout.hairline,
    borderRadius: radius.sm,
    gap: spacing.sm,
  },
  gateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  gateTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  gateSubtitle: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  revealButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.xl,
    alignSelf: 'flex-start',
  },
  revealButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  hideAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.xl,
    borderWidth: layout.hairline,
  },
  hideAgainText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
});
