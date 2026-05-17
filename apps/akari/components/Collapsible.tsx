import { PropsWithChildren, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useColorScheme() ?? 'light';

  return (
    <ThemedView>
      <Pressable
        style={({ pressed }) => [styles.heading, pressed && { opacity: 0.8 }]}
        onPress={() => setIsOpen((value) => !value)}
        
        accessibilityRole="button"
        accessibilityLabel={`Toggle ${title}`}
        accessibilityHint={isOpen ? 'Collapse section' : 'Expand section'}
      >
        <IconSymbol
          name={isOpen ? 'chevron.down' : 'chevron.right'}
          size={18}
          weight="medium"
          color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
        />

        <ThemedText type="defaultSemiBold">{title}</ThemedText>
      </Pressable>
      {isOpen ? (
        <ThemedView style={styles.content}>{children}</ThemedView>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  content: {
    marginTop: 6,
    marginLeft: 24,
  },
});
