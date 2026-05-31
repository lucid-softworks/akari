import { Redirect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MastodonSuggestionRow } from '@/components/onboarding/MastodonSuggestionRow';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { fontSize, fontWeight, opacity, radius, semanticColors, spacing } from '@/constants/tokens';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { markMastodonOnboardingComplete } from '@/hooks/queries/useMastodonOnboardingComplete';
import { useMastodonSuggestions } from '@/hooks/queries/useMastodonSuggestions';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Second onboarding step for new Mastodon accounts: suggested follows so
 * the home feed isn't empty on the first visit. Reached from the profile
 * screen's Save / Skip, and also directly by the tabs-layout guard when
 * the user has already saved a profile but hasn't finished onboarding.
 *
 * Both Done and Skip flip the `mastodonOnboardingComplete` flag — the
 * flag means "we've shown the onboarding flow," not "the user followed
 * anyone." Some servers don't surface suggestions at all (GoToSocial in
 * certain configurations 404s both endpoints); we render the empty state
 * + the same Done / Skip pair so the user can still escape.
 */
export default function MastodonFollowOnboardingScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: currentAccount } = useCurrentAccount();
  const suggestions = useMastodonSuggestions(20);

  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  const helperColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const screenBackground = useThemeColor({}, 'background');

  const finish = useCallback(() => {
    if (!currentAccount?.did) return;
    markMastodonOnboardingComplete(currentAccount.did, queryClient);
    setRedirectTo('/');
  }, [currentAccount?.did, queryClient]);

  if (redirectTo) {
    return <Redirect href={redirectTo as never} />;
  }

  const items = suggestions.data ?? [];
  const showSpinner = suggestions.isLoading;
  const showEmpty = !suggestions.isLoading && items.length === 0;

  return (
    <ThemedView style={[styles.container, { backgroundColor: screenBackground }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + spacing.xl,
            paddingBottom: insets.bottom + spacing.xl,
          },
        ]}
      >
        <View style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            {t('auth.onboardingFollowTitle')}
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: helperColor }]}>
            {t('auth.onboardingFollowSubtitle')}
          </ThemedText>

          {showSpinner ? (
            <View style={styles.statusBox}>
              <ActivityIndicator />
            </View>
          ) : null}

          {showEmpty ? (
            <View style={styles.statusBox}>
              <ThemedText style={[styles.emptyText, { color: helperColor }]}>
                {t('auth.onboardingFollowEmpty')}
              </ThemedText>
            </View>
          ) : null}

          {items.length > 0 ? (
            <View style={styles.list}>
              {items.map((suggestion) => (
                <MastodonSuggestionRow
                  key={suggestion.account.id}
                  account={suggestion.account}
                />
              ))}
            </View>
          ) : null}

          <Pressable
            style={styles.primaryButton}
            onPress={finish}
            accessibilityRole="button"
          >
            <ThemedText style={styles.primaryButtonText}>
              {t('auth.onboardingFollowDone')}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={finish}
            accessibilityRole="button"
            style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
          >
            <ThemedText style={[styles.skipText, { color: helperColor }]}>
              {t('auth.onboardingFollowSkip')}
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 520,
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fontSize.base,
    lineHeight: 22,
  },
  statusBox: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  list: {
    gap: 0,
  },
  primaryButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: semanticColors.systemBlue,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  skipText: {
    fontSize: fontSize.base,
  },
  pressed: {
    opacity: 0.7,
  },
});
