import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { activeOpacity, fontSize, fontWeight, radius, semanticColors, shadows, spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

type HomeFabProps = {
  onPostPress: () => void;
  onReviewPress: () => void;
};

// `position: fixed` pins the FAB to the viewport on web, where the
// document body now scrolls (home feed + profiles + settings). With
// `position: absolute` the FAB was tied to its parent container, which
// is page-tall now, so it scrolled away with the rest of the content.
// Native RN doesn't support `fixed`, so we keep `absolute` there — the
// FAB lives over a scroll container that doesn't move.
const FAB_POSITION = (Platform.OS === 'web' ? 'fixed' : 'absolute') as 'absolute';

export function HomeFab({ onPostPress, onReviewPress }: HomeFabProps) {
  const { t } = useTranslation();
  const [showFabMenu, setShowFabMenu] = useState(false);

  return (
    <>
      {showFabMenu && (
        <Pressable
          style={({ pressed }) => [styles.fabOverlay, pressed && { opacity: 1 }]}
          onPress={() => setShowFabMenu(false)}
        >
          <View style={[styles.fabMenu, { bottom: 90 }]}>
            <Pressable
              style={({ pressed }) => [styles.fabMenuItem, pressed && { opacity: activeOpacity.default }]}
              onPress={() => {
                setShowFabMenu(false);
                onPostPress();
              }}
            >
              <IconSymbol name="square.and.pencil" size={18} color="white" />
              <ThemedText style={styles.fabMenuText}>{t('home.fabPost')}</ThemedText>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.fabMenuItem, pressed && { opacity: activeOpacity.default }]}
              onPress={() => {
                setShowFabMenu(false);
                onReviewPress();
              }}
            >
              <IconSymbol name="star.fill" size={18} color="white" />
              <ThemedText style={styles.fabMenuText}>{t('home.fabReview')}</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      )}

      <Pressable
        style={({ pressed }) => [styles.fab, { bottom: 20 }, pressed && { opacity: activeOpacity.subtle }]}
        onPress={() => setShowFabMenu((prev) => !prev)}
      >
        <IconSymbol name="plus" size={24} color="white" />
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: FAB_POSITION,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: semanticColors.systemBlue,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  fabOverlay: {
    position: FAB_POSITION,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  fabMenu: {
    position: FAB_POSITION,
    right: spacing.xl,
    gap: spacing.sm,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: semanticColors.systemBlue,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    ...shadows.md,
  },
  fabMenuText: {
    color: '#fff',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});
