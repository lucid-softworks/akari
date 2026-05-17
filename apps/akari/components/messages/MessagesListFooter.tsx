import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { fontSize, opacity, spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

export function MessagesListFooter() {
  const { t } = useTranslation();

  return (
    <ThemedView style={styles.loadingFooter}>
      <ThemedText style={styles.loadingText}>{t('common.loading')}...</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  loadingFooter: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSize.lg,
    opacity: opacity.tertiary,
  },
});
