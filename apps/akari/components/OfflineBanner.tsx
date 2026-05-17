import { addEventListener, configure } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { fontSize, fontWeight, spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

// On web, NetInfo's default `reachabilityUrl` is `/` with `HEAD` — which
// against Metro / a static SPA host produces a steady stream of 404s in the
// console (every 60s when online, every 5s when offline). `navigator.onLine`
// is enough for offline detection in the browser, so disable the active
// reachability probe on web. Native keeps the default behaviour.
if (Platform.OS === 'web') {
  configure({ reachabilityShouldRun: () => false });
}

export function OfflineBanner() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = addEventListener((state) => {
      setIsOffline(state.isConnected === false);
    });
    return unsubscribe;
  }, []);

  if (!isOffline) return null;

  return (
    <View style={[styles.banner, { paddingTop: insets.top + spacing.sm }]} accessibilityRole="alert">
      <ThemedText style={styles.text}>{t('common.offline')}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: '#1f1f1f',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  text: {
    color: '#fafafa',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
});
