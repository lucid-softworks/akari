import { Image } from '@/components/Image';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { fontSize, fontWeight, layout, opacity, radius, semanticColors, spacing } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { Link, Stack, usePathname } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';

/**
 * Branded 404 surface that replaces expo-router's default
 * "this screen does not exist" placeholder. Renders for any unknown
 * route on web and any unhandled deep link on native.
 */
export default function NotFoundScreen() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const labelColor = useThemeColor({ light: '#374151', dark: '#E2E8F0' }, 'text');
  const helperColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const codeBackground = useThemeColor({ light: '#F3F4F6', dark: '#15181c' }, 'background');
  const codeBorder = useThemeColor({ light: '#E5E7EB', dark: '#1F212D' }, 'border');

  return (
    <>
      <Stack.Screen options={{ title: '404', headerShown: false }} />
      <ThemedView style={styles.container}>
        <View style={styles.content}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <ThemedText type="title" style={[styles.code, { color: helperColor }]}>
            404
          </ThemedText>
          <ThemedText type="title" style={[styles.title, { color: labelColor }]}>
            {t('errors.screenNotFound')}
          </ThemedText>
          {pathname ? (
            <View style={[styles.pathBox, { backgroundColor: codeBackground, borderColor: codeBorder }]}>
              <ThemedText style={[styles.pathText, { color: helperColor }]} numberOfLines={2}>
                {pathname}
              </ThemedText>
            </View>
          ) : null}
          <Link href={'/' as never} asChild>
            <ThemedText style={styles.primaryButton}>
              {t('errors.goToHome')}
            </ThemedText>
          </Link>
        </View>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  content: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: spacing.md,
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    opacity: opacity.tertiary,
  },
  code: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: fontWeight.bold,
    letterSpacing: 4,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  pathBox: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: layout.hairline,
    maxWidth: '100%',
  },
  pathText: {
    fontFamily: Platform.OS === 'web' ? 'ui-monospace, SFMono-Regular, monospace' : 'SpaceMono',
    fontSize: fontSize.sm,
  },
  primaryButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: semanticColors.systemBlue,
    color: '#ffffff',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    overflow: 'hidden',
  },
});
