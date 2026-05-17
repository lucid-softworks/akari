import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';

type VideoCaptionProps = {
  title?: string;
  description?: string;
};

/**
 * Renders the optional title + description block beneath the video
 * surface. Returns null when neither has content.
 */
export function VideoCaption({ title, description }: VideoCaptionProps) {
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

  const hasTitle = typeof title === 'string' && title.trim().length > 0;
  const hasDescription = typeof description === 'string' && description.trim().length > 0;

  if (!hasTitle && !hasDescription) {
    return null;
  }

  return (
    <ThemedView style={styles.content}>
      {hasTitle ? (
        <ThemedText style={[styles.title, { color: textColor }]} numberOfLines={2}>
          {title}
        </ThemedText>
      ) : null}
      {hasDescription ? (
        <ThemedText style={[styles.description, { color: secondaryTextColor }]} numberOfLines={2}>
          {description}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  description: {
    fontSize: 14,
    lineHeight: 18,
  },
});
