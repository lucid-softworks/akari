import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { fontSize, fontWeight, spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

const POLL_INTERVAL_MS = 5000;
const REQUEST_TIMEOUT_MS = 3000;

export function DevServerBanner() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [isDisconnected, setIsDisconnected] = useState(false);

  useEffect(() => {
    if (!__DEV__) return;

    const hostUri = Constants.expoConfig?.hostUri;
    if (!hostUri) return;

    const statusUrl = `http://${hostUri}/status`;
    let cancelled = false;

    const check = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        const response = await fetch(statusUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (cancelled) return;
        const body = await response.text();
        setIsDisconnected(!body.includes('packager-status:running'));
      } catch {
        if (cancelled) return;
        setIsDisconnected(true);
      }
    };

    void check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!__DEV__ || !isDisconnected) return null;

  return (
    <View style={[styles.banner, { paddingTop: insets.top + spacing.sm }]} accessibilityRole="alert">
      <ThemedText style={styles.text}>{t('common.devServerDisconnected')}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#7c2d12',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  text: {
    color: '#fff7ed',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
});
