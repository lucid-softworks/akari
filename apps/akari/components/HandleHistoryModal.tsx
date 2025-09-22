import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { VirtualizedList } from '@/components/ui/VirtualizedList';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useHandleHistory } from '@/hooks/useHandleHistory';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { formatRelativeTime } from '@/utils/timeUtils';

type HandleHistoryEntry = {
  handle: string;
  changedAt: string;
  pds: string;
};

type HandleHistoryModalProps = {
  visible: boolean;
  onClose: () => void;
  did: string;
  currentHandle: string;
};

export function HandleHistoryModal({ visible, onClose, did, currentHandle }: HandleHistoryModalProps) {
  const { t } = useTranslation();
  const { data: handleHistory = [], isLoading } = useHandleHistory(did);
  const borderColor = useBorderColor();
  const backgroundColor = useThemeColor({ light: '#ffffff', dark: '#151718' }, 'background');
  const textColor = useThemeColor({ light: '#000000', dark: '#ffffff' }, 'text');

  const renderHandleEntry = ({ item, index }: { item: HandleHistoryEntry; index: number }) => {
    const isCurrent = index === 0 && item.handle === currentHandle;

    return (
      <ThemedView style={[styles.handleEntry, { borderBottomColor: borderColor }]}>
        <View style={styles.handleInfo}>
          <View style={styles.handleRow}>
            <ThemedText style={[styles.handleText, isCurrent && styles.currentHandleText]}>@{item.handle}</ThemedText>
            {isCurrent && (
              <View style={styles.currentBadge}>
                <ThemedText style={styles.currentBadgeText}>{t('common.current')}</ThemedText>
              </View>
            )}
          </View>
          <ThemedText style={styles.timestampText}>{formatRelativeTime(item.changedAt)}</ThemedText>
          <ThemedText style={styles.pdsText}>{item.pds}</ThemedText>
        </View>
        {isCurrent && <IconSymbol name="checkmark.circle.fill" size={20} color="#34C759" />}
      </ThemedView>
    );
  };

  const renderEmptyState = () => (
    <ThemedView style={styles.emptyState}>
      <IconSymbol name="clock" size={48} color={textColor} style={styles.emptyIcon} />
      <ThemedText style={styles.emptyTitle}>{t('profile.noHandleHistory')}</ThemedText>
      <ThemedText style={styles.emptyDescription}>{t('profile.noHandleHistoryDescription')}</ThemedText>
    </ThemedView>
  );

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <ThemedView style={[styles.container, { backgroundColor }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <ThemedText style={[styles.headerButtonText, { color: '#007AFF' }]}>{t('common.cancel')}</ThemedText>
            </TouchableOpacity>

            <ThemedText style={[styles.headerTitle, { color: textColor }]}>{t('profile.handleHistory')}</ThemedText>

            <View style={styles.headerSpacer} />
          </View>

          {/* Content */}
          <View style={styles.content}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ThemedText style={styles.loadingText}>{t('common.loading')}</ThemedText>
              </View>
            ) : handleHistory.length === 0 ? (
              renderEmptyState()
            ) : (
              <VirtualizedList
                data={handleHistory}
                renderItem={renderHandleEntry}
                keyExtractor={(item, index) => `${item.handle}-${index}`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                estimatedItemSize={72}
              />
            )}
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    width: '95%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: 12,
    padding: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  headerButtonText: {
    fontSize: 17,
    fontWeight: '400',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 60,
  },
  content: {
    flex: 1,
    maxHeight: 400,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
  },
  listContent: {
    paddingVertical: 8,
  },
  handleEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  handleInfo: {
    flex: 1,
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  handleText: {
    fontSize: 16,
    fontWeight: '500',
  },
  currentHandleText: {
    color: '#34C759',
  },
  currentBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#34C759',
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  timestampText: {
    fontSize: 14,
    opacity: 0.7,
  },
  pdsText: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 20,
  },
});
