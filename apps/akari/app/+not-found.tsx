import { Link, Stack, usePathname } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTranslation } from '@/hooks/useTranslation';

export default function NotFoundScreen() {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <ThemedView style={styles.container}>
        <ThemedText type="title">{t('errors.screenNotFound')}</ThemedText>
        <ThemedText style={styles.pathname}>
          {t('errors.pathname', { pathname })}
        </ThemedText>
        <Link href="/index" style={styles.link}>
          <ThemedText type="link">{t('errors.goToHome')}</ThemedText>
        </Link>
        <Link href="/_sitemap" style={styles.link}>
          <ThemedText type="link">{t('errors.goToSitemap')}</ThemedText>
        </Link>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  pathname: {
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
    opacity: 0.7,
  },
  pathnameValue: {
    fontFamily: 'monospace',
    fontWeight: 'bold',
    opacity: 1,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
