import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { fontSize, fontWeight, layout, radius, spacing } from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import {
  registerExternalLinkConfirm,
  type ExternalLinkConfirmRequest,
} from '@/utils/externalLink';

/**
 * App-root host that listens for `openExternalLink` calls from anywhere in
 * the tree and renders the leaving-akari confirmation modal. Mounted once
 * (in the root layout); subsequent mounts are no-ops because the singleton
 * listener overwrite means the most-recently-mounted host wins.
 */
export function ExternalLinkConfirmHost() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [request, setRequest] = useState<ExternalLinkConfirmRequest | null>(null);

  const panelColor = useThemeColor({}, 'panel');
  const borderColor = useThemeColor({}, 'border');
  const lineSoft = useThemeColor({}, 'lineSoft');
  const textPrimary = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accentColor = useThemeColor({}, 'tint');

  useEffect(() => {
    registerExternalLinkConfirm((next) => setRequest(next));
    return () => registerExternalLinkConfirm(null);
  }, []);

  const visible = request !== null;

  const decide = (open: boolean) => {
    if (!request) return;
    request.resolve(open);
    setRequest(null);
  };

  const handleCopy = async () => {
    if (!request) return;
    await Clipboard.setStringAsync(request.url);
    showToast({ message: t('common.copiedToClipboard'), type: 'success' });
  };

  // Truncate long hosts in the headline. Full URL still shows below.
  const host = request ? safeHostname(request.url) : '';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => decide(false)}
    >
      <Pressable style={styles.backdrop} onPress={() => decide(false)}>
        <Pressable
          style={[styles.card, { backgroundColor: panelColor, borderColor }]}
          onPress={() => undefined}
        >
          <View style={styles.iconRow}>
            <View style={[styles.iconCircle, { backgroundColor: lineSoft }]}>
              <IconSymbol name="arrow.up.right.square" size={24} color={accentColor} />
            </View>
          </View>
          <ThemedText style={[styles.title, { color: textPrimary }]}>
            {t('confirmExternal.title')}
          </ThemedText>
          <ThemedText style={[styles.body, { color: textSecondary }]}>
            {t('confirmExternal.body', { host })}
          </ThemedText>
          <View style={[styles.urlBox, { borderColor: lineSoft }]}>
            <ThemedText
              style={[styles.urlText, { color: textPrimary }]}
              numberOfLines={3}
              selectable
            >
              {request?.url ?? ''}
            </ThemedText>
          </View>
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.buttonGhost,
                { borderColor: lineSoft },
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => decide(false)}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
            >
              <ThemedText style={[styles.buttonText, { color: textPrimary }]}>
                {t('common.cancel')}
              </ThemedText>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.buttonGhost,
                { borderColor: lineSoft },
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleCopy}
              accessibilityRole="button"
              accessibilityLabel={t('confirmExternal.copy')}
            >
              <IconSymbol name="doc.on.doc" size={16} color={textPrimary} />
              <ThemedText style={[styles.buttonText, { color: textPrimary }]}>
                {t('confirmExternal.copy')}
              </ThemedText>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.buttonPrimary,
                { backgroundColor: accentColor, borderColor: accentColor },
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => decide(true)}
              accessibilityRole="button"
              accessibilityLabel={t('confirmExternal.continue')}
            >
              <ThemedText style={[styles.buttonText, { color: '#ffffff' }]}>
                {t('confirmExternal.continue')}
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.md,
    borderWidth: layout.hairline,
    padding: spacing.xl,
    gap: spacing.md,
  },
  iconRow: {
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  body: {
    fontSize: fontSize.base,
    textAlign: 'center',
    lineHeight: 20,
  },
  urlBox: {
    borderWidth: layout.hairline,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  urlText: {
    fontSize: fontSize.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: layout.hairline,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
  },
  buttonPrimary: {
    borderWidth: 1,
  },
  buttonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});
