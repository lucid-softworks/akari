import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useToast } from '@/contexts/ToastContext';
import { useUpdateListMembership } from '@/hooks/mutations/useUpdateListMembership';
import { useActorListMemberships } from '@/hooks/queries/useActorListMemberships';
import { useViewerLists } from '@/hooks/queries/useViewerLists';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

import type { BlueskyListView } from '@/bluesky-api';

export type ProfileListManagerModalProps = {
  visible: boolean;
  onClose: () => void;
  actorHandle: string;
  actorDid?: string;
};

type MembershipState = {
  selected: Set<string>;
  recordUris: Record<string, string>;
};

export function ProfileListManagerModal({ visible, onClose, actorHandle, actorDid }: ProfileListManagerModalProps) {
  const { t } = useTranslation();
  const { showToast, hideToast } = useToast();
  const themeBackground = useThemeColor({ light: '#ffffff', dark: '#151718' }, 'background');
  const surfaceColor = useThemeColor({ light: '#f5f5f7', dark: '#1c1c1e' }, 'background');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({}, 'tint');

  const { data: listsData, isLoading: isListsLoading, error: listsError } = useViewerLists();
  const {
    data: membershipData,
    isLoading: isMembershipLoading,
    error: membershipError,
  } = useActorListMemberships(visible ? actorDid : undefined);
  const updateMembership = useUpdateListMembership();

  const [membershipState, setMembershipState] = useState<MembershipState>({
    selected: new Set(),
    recordUris: {},
  });

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (!membershipData) {
      setMembershipState({ selected: new Set(), recordUris: {} });
      return;
    }

    setMembershipState({
      selected: new Set(membershipData.listUris),
      recordUris: { ...membershipData.recordUrisByListUri },
    });
  }, [membershipData, visible]);

  const lists: BlueskyListView[] = useMemo(() => listsData?.lists ?? [], [listsData]);
  const isLoading = isListsLoading || (visible && isMembershipLoading);
  const hasError = Boolean(listsError || membershipError);

  const handleToggle = async (listUri: string) => {
    if (!actorDid) {
      const toastId = showToast({
        type: 'error',
        title: t('profile.addToLists'),
        message: t('common.somethingWentWrong'),
      });
      setTimeout(() => hideToast(toastId), 3000);
      return;
    }

    const isMember = membershipState.selected.has(listUri);
    const toastId = showToast({
      id: `${listUri}-${actorDid}`,
      type: 'info',
      title: t('profile.addToLists'),
      message: t('common.loading'),
    });

    try {
      if (isMember) {
        const recordUri = membershipState.recordUris[listUri];
        if (!recordUri) {
          throw new Error('List item URI missing');
        }

        await updateMembership.mutateAsync({
          did: actorDid,
          listUri,
          action: 'remove',
          listItemUri: recordUri,
        });

        setMembershipState((current) => {
          const nextSelected = new Set(current.selected);
          nextSelected.delete(listUri);
          const nextRecordUris = { ...current.recordUris };
          delete nextRecordUris[listUri];
          return { selected: nextSelected, recordUris: nextRecordUris };
        });
      } else {
        const response = await updateMembership.mutateAsync({
          did: actorDid,
          listUri,
          action: 'add',
        });

        setMembershipState((current) => {
          const nextSelected = new Set(current.selected).add(listUri);
          const nextRecordUris = { ...current.recordUris };
          if (typeof response === 'object' && response && 'uri' in response) {
            nextRecordUris[listUri] = (response as { uri: string }).uri;
          }
          return { selected: nextSelected, recordUris: nextRecordUris };
        });
      }

      showToast({
        id: toastId,
        type: 'success',
        title: t('profile.addToLists'),
        message: t('common.success'),
      });
    } catch (error) {
      console.error('List membership update failed:', error);
      showToast({
        id: toastId,
        type: 'error',
        title: t('profile.addToLists'),
        message: t('common.somethingWentWrong'),
      });
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <ThemedView style={[styles.container, { backgroundColor: themeBackground }]}>
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
              onPress={onClose}
              style={styles.closeButton}
            >
              <IconSymbol name="xmark" size={20} color={textColor} />
            </TouchableOpacity>
            <ThemedText style={[styles.title, { color: textColor }]}>{t('profile.addToLists')}</ThemedText>
            <View style={styles.closeButton} />
          </View>

          <ThemedView style={[styles.content, { backgroundColor: surfaceColor }]}> 
            <View style={[styles.handlePill, { borderColor }]}>
              <ThemedText style={[styles.handleText, { color: textColor }]}>@{actorHandle}</ThemedText>
            </View>
            {isLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator color={accentColor} />
                <ThemedText style={[styles.loadingText, { color: textColor }]}>{t('common.loading')}</ThemedText>
              </View>
            ) : hasError ? (
              <View style={styles.loadingState}>
                <ThemedText style={[styles.loadingText, { color: textColor }]}>{t('common.somethingWentWrong')}</ThemedText>
                <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.retryButton}>
                  <ThemedText style={[styles.retryText, { color: accentColor }]}>{t('common.ok')}</ThemedText>
                </TouchableOpacity>
              </View>
            ) : lists.length === 0 ? (
              <View style={styles.loadingState}>
                <ThemedText style={[styles.loadingText, { color: textColor }]}>{t('profile.noContent')}</ThemedText>
              </View>
            ) : (
              <View>
                {lists.map((list) => {
                  const isMember = membershipState.selected.has(list.uri);
                  return (
                    <TouchableOpacity
                      key={list.uri}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isMember }}
                      style={[styles.listRow, { borderBottomColor: borderColor }]}
                      onPress={() => handleToggle(list.uri)}
                      disabled={updateMembership.isPending}
                    >
                      <View style={styles.listInfo}>
                        <ThemedText style={[styles.listName, { color: textColor }]}>{list.name}</ThemedText>
                        {list.description ? (
                          <ThemedText style={styles.listDescription}>{list.description}</ThemedText>
                        ) : null}
                      </View>
                      {isMember ? (
                        <IconSymbol name="checkmark.circle.fill" size={24} color={accentColor} />
                      ) : (
                        <View style={[styles.unselectedIndicator, { borderColor }]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ThemedView>

          <View style={[styles.footer, { borderTopColor: borderColor }]}> 
            <TouchableOpacity
              accessibilityRole="button"
              onPress={onClose}
              style={styles.footerButton}
            >
              <ThemedText style={[styles.footerButtonText, { color: accentColor }]}>{t('common.cancel')}</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  handlePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  handleText: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.8,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 16,
    fontWeight: '600',
  },
  listDescription: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 4,
  },
  unselectedIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-end',
  },
  footerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  footerButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
