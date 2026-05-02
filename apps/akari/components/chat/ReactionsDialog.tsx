import { Image } from 'expo-image';
import React, { useMemo } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { spacing, radius, fontSize, fontWeight, layout, activeOpacity } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { useNavigateToProfile } from '@/utils/navigation';

type Reaction = {
  value: string;
  sender: { did: string };
  createdAt: string;
};

type Reactor = {
  did: string;
  handle?: string;
  displayName?: string;
  avatar?: string;
};

type ReactionsDialogProps = {
  visible: boolean;
  reactions: Reaction[];
  /** Member directory for resolving reactor DIDs to display info — typically
   * the convo members + current user. Reactors not present here render with
   * just a truncated DID. */
  reactors: Reactor[];
  onDismiss: () => void;
};

export function ReactionsDialog({ visible, reactions, reactors, onDismiss }: ReactionsDialogProps) {
  const { t } = useTranslation();
  const { bottom } = useSafeAreaInsets();
  const navigateToProfile = useNavigateToProfile();

  const sheetBg = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'text');
  const textColor = useThemeColor({}, 'text');

  const directory = useMemo(() => {
    const m = new Map<string, Reactor>();
    for (const r of reactors) m.set(r.did, r);
    return m;
  }, [reactors]);

  // Group reactions by emoji, preserving original order of first appearance.
  const grouped = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, Reaction[]>();
    for (const r of reactions) {
      if (!map.has(r.value)) {
        order.push(r.value);
        map.set(r.value, []);
      }
      map.get(r.value)!.push(r);
    }
    return order.map((emoji) => ({ emoji, items: map.get(emoji)! }));
  }, [reactions]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable
          style={[styles.sheetWrapper, { paddingBottom: bottom + spacing.md }]}
          onPress={(event) => event.stopPropagation()}
        >
          <ThemedView style={[styles.sheet, { backgroundColor: sheetBg, borderColor }]}>
            <View style={styles.header}>
              <ThemedText type="defaultSemiBold" style={{ color: textColor }}>
                {t('messages.reactions')}
              </ThemedText>
            </View>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              {grouped.map(({ emoji, items }, gi) => (
                <View key={emoji}>
                  {gi > 0 ? <View style={[styles.divider, { backgroundColor: borderColor }]} /> : null}
                  <View style={styles.groupHeader}>
                    <ThemedText style={styles.groupEmoji}>{emoji}</ThemedText>
                    <ThemedText style={[styles.groupCount, { color: iconColor }]}>
                      {items.length}
                    </ThemedText>
                  </View>
                  {items.map((r) => {
                    const reactor = directory.get(r.sender.did);
                    const name = reactor?.displayName || reactor?.handle || r.sender.did;
                    return (
                      <TouchableOpacity
                        key={`${r.sender.did}-${r.createdAt}`}
                        style={styles.row}
                        onPress={() => {
                          if (reactor?.handle) {
                            navigateToProfile({ actor: reactor.handle });
                            onDismiss();
                          }
                        }}
                        activeOpacity={activeOpacity.default}
                        disabled={!reactor?.handle}
                      >
                        {reactor?.avatar ? (
                          <Image source={{ uri: reactor.avatar }} style={styles.avatar} />
                        ) : (
                          <View style={[styles.avatar, { backgroundColor: borderColor }]} />
                        )}
                        <View style={styles.rowText}>
                          <ThemedText style={[styles.rowName, { color: textColor }]} numberOfLines={1}>
                            {name}
                          </ThemedText>
                          {reactor?.handle ? (
                            <ThemedText
                              style={[styles.rowHandle, { color: iconColor }]}
                              numberOfLines={1}
                            >
                              @{reactor.handle}
                            </ThemedText>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.doneButton, { borderTopColor: borderColor }]}
              onPress={onDismiss}
              activeOpacity={activeOpacity.default}
            >
              <ThemedText style={[styles.doneText, { color: textColor }]}>{t('common.done')}</ThemedText>
            </TouchableOpacity>
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
  sheetWrapper: {
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    borderRadius: radius.lg,
    borderWidth: layout.hairline,
    overflow: 'hidden',
    ...Platform.select({
      web: { maxWidth: 480, alignSelf: 'center', width: '100%' },
      default: {},
    }),
  },
  header: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  scroll: {
    maxHeight: 360,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  groupEmoji: {
    fontSize: fontSize.xxl,
  },
  groupCount: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  divider: {
    height: layout.hairline,
    marginVertical: spacing.xs,
    marginLeft: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  rowText: { flex: 1 },
  rowName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  rowHandle: {
    fontSize: fontSize.sm,
  },
  doneButton: {
    borderTopWidth: layout.hairline,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  doneText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
});
