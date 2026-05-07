import { Image } from '@/components/Image';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import {
  spacing,
  radius,
  fontSize,
  fontWeight,
  semanticColors,
  layout,
  activeOpacity,
} from '@/constants/tokens';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Auth landing screen — picks between OAuth and app-password sign-in. Both
 * paths land on dedicated screens with their own UI; this screen never
 * collects credentials itself, just routes the user to the right form.
 */
export default function SignInScreen() {
  const { t } = useTranslation();
  const { data: currentAccount } = useCurrentAccount();

  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#1F212D' }, 'border');
  const helperColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const accentColor = semanticColors.systemBlue;

  const goToOauth = () => router.push('/(auth)/oauth');
  const goToPassword = () => router.push('/(auth)/password');

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.logo}
              contentFit="contain"
            />
            <ThemedText type="title" style={styles.title}>
              {t('auth.welcomeTitle')}
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: helperColor }]}>
              {t('auth.welcomeSubtitle')}
            </ThemedText>
          </View>

          <View style={styles.choices}>
            <TouchableOpacity
              style={[styles.choicePrimary, { backgroundColor: accentColor }]}
              onPress={goToOauth}
              activeOpacity={activeOpacity.default}
              accessibilityRole="button"
            >
              <View style={styles.choiceText}>
                <ThemedText style={styles.choicePrimaryTitle}>{t('auth.oauthChoiceTitle')}</ThemedText>
                <ThemedText style={styles.choicePrimarySubtitle}>
                  {t('auth.oauthChoiceSubtitle')}
                </ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={20} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.choiceSecondary, { borderColor }]}
              onPress={goToPassword}
              activeOpacity={activeOpacity.default}
              accessibilityRole="button"
            >
              <View style={styles.choiceText}>
                <ThemedText style={styles.choiceSecondaryTitle}>
                  {t('auth.passwordChoiceTitle')}
                </ThemedText>
                <ThemedText style={[styles.choiceSecondarySubtitle, { color: helperColor }]}>
                  {t('auth.passwordChoiceSubtitle')}
                </ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={20} color={helperColor} />
            </TouchableOpacity>
          </View>

          {currentAccount ? (
            <View style={styles.footerToggle}>
              <ThemedText style={[styles.footerText, { color: helperColor }]}>
                {t('auth.needDifferentAccount')}
              </ThemedText>
              <TouchableOpacity onPress={goToPassword} accessibilityRole="button">
                <ThemedText style={styles.footerLinkText}>
                  {t('auth.connectNew')}
                </ThemedText>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 480,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    gap: spacing.md,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: radius.lg,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.base,
    lineHeight: 22,
    textAlign: 'center',
  },
  choices: {
    gap: spacing.md,
  },
  choicePrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
  choiceSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    borderWidth: layout.border,
  },
  choiceText: {
    flex: 1,
    gap: 4,
  },
  choicePrimaryTitle: {
    color: '#ffffff',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  choicePrimarySubtitle: {
    color: '#ffffff',
    fontSize: fontSize.sm,
    opacity: 0.85,
  },
  choiceSecondaryTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  choiceSecondarySubtitle: {
    fontSize: fontSize.sm,
  },
  footerToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  footerText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  footerLinkText: {
    fontSize: fontSize.sm,
    color: semanticColors.systemBlue,
    fontWeight: fontWeight.semibold,
  },
});
