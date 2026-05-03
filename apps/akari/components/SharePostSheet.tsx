import * as Clipboard from 'expo-clipboard';
import React from 'react';
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { activeOpacity, fontSize, fontWeight, layout, radius, spacing } from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type SharePostSheetProps = {
  visible: boolean;
  onDismiss: () => void;
  /** Callback for "Send via chat" — caller is responsible for opening
   *  whatever conversation picker they want. We don't include that
   *  picker here because each call site (PostCard, PostDetailView) may
   *  manage its own modal stack. */
  onSendToChat: () => void;
  postUrl: string;
  postUri: string;
  postCid: string;
};

/**
 * Bottom sheet that replaces the platform Share. Three rows:
 * - Copy link (the public bsky.app URL)
 * - Send via chat (delegates to the parent so it can open a chat picker)
 * - Embed post (copies the official Bluesky embed snippet)
 */
export function SharePostSheet({
  visible,
  onDismiss,
  onSendToChat,
  postUrl,
  postUri,
  postCid,
}: SharePostSheetProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { bottom } = useSafeAreaInsets();

  const sheetBg = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'text');
  const textColor = useThemeColor({}, 'text');

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(postUrl);
    showToast({ type: 'success', message: t('post.share.linkCopied') });
    onDismiss();
  };

  const handleEmbed = async () => {
    // Mirror the official Bluesky embed snippet. The script fills in
    // the post body at render time, so we only need URI + CID + a
    // fallback link inside the blockquote so non-JS readers see
    // something useful.
    const snippet =
      `<blockquote class="bluesky-embed" data-bluesky-uri="${postUri}" data-bluesky-cid="${postCid}">\n` +
      `  <p><a href="${postUrl}?ref_src=embed">${postUrl}</a></p>\n` +
      `</blockquote>\n` +
      `<script async src="https://embed.bsky.app/static/embed.js" charset="utf-8"></script>`;
    await Clipboard.setStringAsync(snippet);
    showToast({ type: 'success', message: t('post.share.embedCopied') });
    onDismiss();
  };

  const rows: {
    key: string;
    icon: React.ComponentProps<typeof IconSymbol>['name'];
    label: string;
    onPress: () => void;
  }[] = [
    { key: 'copy', icon: 'link', label: t('post.share.copyLink'), onPress: handleCopyLink },
    { key: 'chat', icon: 'bubble.left.and.bubble.right', label: t('post.share.sendToChat'), onPress: onSendToChat },
    { key: 'embed', icon: 'chevron.left.forwardslash.chevron.right', label: t('post.share.embedPost'), onPress: handleEmbed },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable
          style={[styles.sheetWrapper, { paddingBottom: bottom + spacing.md }]}
          onPress={(e) => e.stopPropagation()}
        >
          <ThemedView style={[styles.sheet, { backgroundColor: sheetBg, borderColor }]}>
            <View style={[styles.header, { borderBottomColor: borderColor }]}>
              <ThemedText style={[styles.headerTitle, { color: textColor }]}>
                {t('post.share.title')}
              </ThemedText>
            </View>
            {rows.map((row, idx) => (
              <View key={row.key}>
                {idx > 0 ? (
                  <View style={[styles.divider, { backgroundColor: borderColor }]} />
                ) : null}
                <TouchableOpacity
                  style={styles.row}
                  onPress={row.onPress}
                  activeOpacity={activeOpacity.default}
                >
                  <IconSymbol name={row.icon} size={20} color={iconColor} />
                  <ThemedText style={[styles.rowText, { color: textColor }]}>
                    {row.label}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            ))}
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetWrapper: { paddingHorizontal: spacing.lg },
  sheet: {
    borderRadius: radius.lg,
    borderWidth: layout.hairline,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
    alignItems: 'center',
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowText: { fontSize: fontSize.base, fontWeight: fontWeight.medium, flex: 1 },
  divider: { height: layout.hairline, marginLeft: spacing.lg + spacing.md + 20 },
});
