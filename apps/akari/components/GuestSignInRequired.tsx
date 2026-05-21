import { router } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { ThemedView } from '@/components/ThemedView';
import { webScreenContainer } from '@/constants/webStyles';
import { useTranslation } from '@/hooks/useTranslation';

type GuestSignInRequiredProps = {
  /**
   * Localized title — typically the name of the feature that requires a
   * session (e.g. "Notifications", "Direct messages").
   */
  title: string;
  /** Optional localized subtitle. Falls back to a generic explanation. */
  subtitle?: string;
};

/**
 * Renders inside any tab/screen that requires authentication. Shown to
 * guest users instead of the screen's real content, with a single CTA
 * that routes to `/(auth)/signin`. We render the same chrome wrappers
 * (themed background, web container, safe-area top) as the real screen
 * so the swap doesn't visibly shift layout.
 */
export function GuestSignInRequired({ title, subtitle }: GuestSignInRequiredProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const fallbackSubtitle = subtitle ?? t('auth.guestRequiredSubtitle');

  return (
    <ThemedView
      style={[
        Platform.OS === 'web' ? webScreenContainer : styles.container,
        { paddingTop: insets.top },
      ]}
    >
      <EmptyState
        title={title}
        subtitle={fallbackSubtitle}
        action={{
          label: t('auth.signInCta'),
          onPress: () => router.push('/(auth)/signin'),
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
