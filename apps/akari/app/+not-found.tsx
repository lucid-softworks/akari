import { Link, Stack, usePathname } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function NotFoundScreen() {
  const pathname = usePathname();

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <ThemedView style={styles.container}>
        <ThemedText type="title">This screen does not exist.</ThemedText>
        <ThemedText style={styles.pathname}>
          Path: <ThemedText style={styles.pathnameValue}>{pathname}</ThemedText>
        </ThemedText>
        <Link href="/" style={styles.link}>
          <ThemedText type="link">Go to home screen!</ThemedText>
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
