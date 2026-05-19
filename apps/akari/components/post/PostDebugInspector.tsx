import * as Clipboard from 'expo-clipboard';
import React, { useMemo } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { fontSize, fontWeight, layout, radius, spacing } from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useThemeColor } from '@/hooks/useThemeColor';

type PostDebugInspectorProps = {
  visible: boolean;
  postUri?: string;
  postCid?: string;
  data: unknown;
  onDismiss: () => void;
};

/**
 * Dev-only modal that dumps whatever post data the caller has access to as
 * pretty-printed JSON. Wired into PostActionsMenu behind a __DEV__ guard so
 * production builds tree-shake the whole thing.
 */
export function PostDebugInspector({
  visible,
  postUri,
  postCid,
  data,
  onDismiss,
}: PostDebugInspectorProps) {
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const panelColor = useThemeColor({}, 'panel');
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');
  const lineSoft = useThemeColor({}, 'lineSoft');
  const textPrimary = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accentColor = useThemeColor({}, 'tint');

  const json = useMemo(() => {
    try {
      return JSON.stringify(data, null, 2);
    } catch (err) {
      return `Failed to stringify post data: ${err instanceof Error ? err.message : String(err)}`;
    }
  }, [data]);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(json);
    showToast({ message: 'Copied post JSON', type: 'success' });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: panelColor,
              borderColor,
              paddingBottom: Math.max(spacing.lg, insets.bottom + spacing.sm),
            },
          ]}
          onPress={() => undefined}
        >
          <View style={[styles.header, { borderBottomColor: lineSoft }]}>
            <View style={styles.headerText}>
              {/* oxlint-disable-next-line i18next/no-literal-string -- dev-only inspector, not user-facing */}
              <ThemedText style={[styles.title, { color: textPrimary }]}>Post JSON (dev)</ThemedText>
              {postUri ? (
                <ThemedText
                  style={[styles.meta, { color: textSecondary }]}
                  numberOfLines={1}
                >
                  {postUri}
                </ThemedText>
              ) : null}
              {postCid ? (
                // oxlint-disable-next-line i18next/no-literal-string -- dev-only inspector
                <ThemedText style={[styles.meta, { color: textSecondary }]} numberOfLines={1}>cid {postCid}</ThemedText>
              ) : null}
            </View>
            <View style={styles.headerActions}>
              <Pressable
                onPress={handleCopy}
                accessibilityLabel="Copy JSON"
                style={({ pressed }) => [
                  styles.headerButton,
                  { borderColor: lineSoft },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <IconSymbol name="doc.on.doc" size={16} color={accentColor} />
                {/* oxlint-disable-next-line i18next/no-literal-string -- dev-only inspector */}
                <ThemedText style={[styles.headerButtonText, { color: accentColor }]}>Copy</ThemedText>
              </Pressable>
              <Pressable
                onPress={onDismiss}
                accessibilityLabel="Close inspector"
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <IconSymbol name="xmark" size={18} color={textSecondary} />
              </Pressable>
            </View>
          </View>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            <ThemedView style={[styles.codeBlock, { backgroundColor }]}>
              <ThemedText style={[styles.codeText, { color: textPrimary }]} selectable>
                {json}
              </ThemedText>
            </ThemedView>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 640,
    maxHeight: '85%',
    borderWidth: layout.hairline,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: layout.hairline,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  meta: {
    fontSize: fontSize.xs,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: layout.hairline,
  },
  headerButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  closeButton: {
    padding: spacing.xs,
    borderRadius: radius.full,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: spacing.md,
  },
  codeBlock: {
    padding: spacing.md,
    borderRadius: radius.sm,
  },
  codeText: {
    fontSize: fontSize.sm,
    lineHeight: 18,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
});
