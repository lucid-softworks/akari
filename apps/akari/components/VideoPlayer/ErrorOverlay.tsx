import { Pressable, StyleSheet } from 'react-native';

import { ThemedCard } from '@/components/ThemedCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type ErrorOverlayProps = {
  message: string | null;
  aspectRatio?: { width: number; height: number };
  onRetry: () => void;
};

/**
 * Error state for the native video player. Tapping the overlay
 * dispatches the reset action in the parent reducer.
 */
export function ErrorOverlay({ message, aspectRatio, onRetry }: ErrorOverlayProps) {
  const { t } = useTranslation();

  const textColor = useThemeColor(
    {
      light: '#000000',
      dark: '#ffffff',
    },
    'text',
  );

  const secondaryTextColor = useThemeColor(
    {
      light: '#666666',
      dark: '#999999',
    },
    'text',
  );

  const ratio = aspectRatio ? aspectRatio.width / aspectRatio.height : 16 / 9;

  return (
    <ThemedCard style={styles.container}>
      <ThemedView style={[styles.videoContainer, { aspectRatio: ratio }]}>
        <Pressable onPress={onRetry} style={({ pressed }) => pressed && { opacity: 0.7 }}>
          <ThemedView style={styles.errorContainer}>
            <ThemedText style={[styles.errorText, { color: textColor }]}>
              {message && message.trim() ? message : 'Failed to load video'}
            </ThemedText>
            <ThemedText style={[styles.retryText, { color: secondaryTextColor }]}>
              {t('ui.tapToRetry')}
            </ThemedText>
          </ThemedView>
        </Pressable>
      </ThemedView>
    </ThemedCard>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    padding: 0,
  },
  videoContainer: {
    width: '100%',
  },
  errorContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  retryText: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
