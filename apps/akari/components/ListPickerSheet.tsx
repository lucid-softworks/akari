import { Image } from '@/components/Image';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BlueskyListView } from '@/bluesky-api';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, radius, fontSize, fontWeight, layout, activeOpacity, semanticColors } from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useCreateList } from '@/hooks/mutations/useCreateList';
import { useListMembership } from '@/hooks/mutations/useListMembership';
import { useLists, useListMembership as useListMembershipQuery } from '@/hooks/queries/useLists';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type ListPickerSheetProps = {
  visible: boolean;
  onDismiss: () => void;
  /** DID of the actor being added to lists. */
  subjectDid?: string;
};

export function ListPickerSheet({ visible, onDismiss, subjectDid }: ListPickerSheetProps) {
  const { t } = useTranslation();
  const { bottom } = useSafeAreaInsets();
  const { showToast } = useToast();

  const sheetBg = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'text');
  const textColor = useThemeColor({}, 'text');
  const inputBg = useThemeColor({ light: '#f5f5f5', dark: '#2c2c2e' }, 'background');
  const tintColor = useThemeColor({}, 'tint');

  const lists = useLists();
  const createList = useCreateList();
  const listPages = lists.data?.pages ?? [];
  const allLists = listPages.flatMap((p) => p.lists);
  // Only curate lists are user-managed for "add to lists" UX. Mod lists
  // (mute/block) are managed via dedicated flows.
  const curateLists = allLists.filter((l) => l.purpose.includes('curatelist'));

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const resetCreateForm = useCallback(() => {
    setCreating(false);
    setNewName('');
    setNewDescription('');
  }, []);

  const handleCreateList = useCallback(() => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createList.mutate(
      { name: trimmed, description: newDescription.trim() || undefined },
      {
        onSuccess: () => {
          resetCreateForm();
        },
        onError: () => {
          showToast({ message: t('common.error'), type: 'error' });
        },
      },
    );
  }, [newName, newDescription, createList, resetCreateForm, showToast, t]);

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
                {t('profile.addToLists')}
              </ThemedText>
            </View>

            {lists.isLoading ? (
              <View style={styles.loading}>
                <ActivityIndicator />
              </View>
            ) : curateLists.length === 0 ? (
              <View style={styles.empty}>
                <ThemedText style={[styles.emptyText, { color: iconColor }]}>
                  {t('lists.noLists')}
                </ThemedText>
              </View>
            ) : (
              <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {curateLists.map((list, idx) => (
                  <ListRow
                    key={list.uri}
                    list={list}
                    subjectDid={subjectDid}
                    isFirst={idx === 0}
                    borderColor={borderColor}
                    iconColor={iconColor}
                    textColor={textColor}
                    onError={() => showToast({ message: t('common.error'), type: 'error' })}
                  />
                ))}
              </ScrollView>
            )}

            {creating ? (
              <View style={[styles.createForm, { borderTopColor: borderColor }]}>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
                  placeholder={t('lists.namePlaceholder')}
                  placeholderTextColor={iconColor}
                  value={newName}
                  onChangeText={setNewName}
                  autoFocus
                  maxLength={64}
                />
                <TextInput
                  style={[styles.input, styles.inputDescription, { backgroundColor: inputBg, borderColor, color: textColor }]}
                  placeholder={t('lists.descriptionPlaceholder')}
                  placeholderTextColor={iconColor}
                  value={newDescription}
                  onChangeText={setNewDescription}
                  multiline
                  maxLength={300}
                />
                <View style={styles.createActions}>
                  <TouchableOpacity
                    style={[styles.createSecondaryButton, { borderColor }]}
                    onPress={resetCreateForm}
                    disabled={createList.isPending}
                    activeOpacity={activeOpacity.default}
                  >
                    <ThemedText style={[styles.createSecondaryText, { color: textColor }]}>
                      {t('common.cancel')}
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.createPrimaryButton,
                      { backgroundColor: tintColor },
                      (!newName.trim() || createList.isPending) && styles.createPrimaryDisabled,
                    ]}
                    onPress={handleCreateList}
                    disabled={!newName.trim() || createList.isPending}
                    activeOpacity={activeOpacity.default}
                  >
                    {createList.isPending ? (
                      <ActivityIndicator color="#000000" />
                    ) : (
                      <ThemedText style={styles.createPrimaryText}>{t('lists.create')}</ThemedText>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={[styles.footerRow, { borderTopColor: borderColor }]}>
                <TouchableOpacity
                  style={styles.footerButton}
                  onPress={() => setCreating(true)}
                  activeOpacity={activeOpacity.default}
                >
                  <IconSymbol name="plus" size={18} color={tintColor} />
                  <ThemedText style={[styles.footerButtonText, { color: tintColor }]}>
                    {t('lists.newList')}
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.footerButton}
                  onPress={onDismiss}
                  activeOpacity={activeOpacity.default}
                >
                  <ThemedText style={[styles.footerButtonText, { color: textColor }]}>
                    {t('common.done')}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type ListRowProps = {
  list: BlueskyListView;
  subjectDid?: string;
  isFirst: boolean;
  borderColor: string;
  iconColor: string;
  textColor: string;
  onError: () => void;
};

function ListRow({ list, subjectDid, isFirst, borderColor, iconColor, textColor, onError }: ListRowProps) {
  const membership = useListMembershipQuery(list.uri, subjectDid);
  const mutation = useListMembership();

  const handleToggle = useCallback(() => {
    if (!subjectDid) return;
    if (membership.isMember && membership.listItemUri) {
      mutation.mutate(
        { action: 'remove', listItemUri: membership.listItemUri, listUri: list.uri },
        { onError },
      );
    } else {
      mutation.mutate({ action: 'add', listUri: list.uri, subjectDid }, { onError });
    }
  }, [subjectDid, membership.isMember, membership.listItemUri, list.uri, mutation, onError]);

  return (
    <>
      {!isFirst ? <View style={[styles.divider, { backgroundColor: borderColor }]} /> : null}
      <TouchableOpacity
        style={styles.row}
        onPress={handleToggle}
        disabled={!subjectDid || mutation.isPending}
        activeOpacity={activeOpacity.default}
      >
        {list.avatar ? (
          <Image source={{ uri: list.avatar }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, { backgroundColor: borderColor }]}>
            <IconSymbol name="list.bullet" size={16} color={iconColor} />
          </View>
        )}
        <View style={styles.rowText}>
          <ThemedText style={[styles.rowName, { color: textColor }]} numberOfLines={1}>
            {list.name}
          </ThemedText>
          {list.listItemCount !== undefined ? (
            <ThemedText style={[styles.rowMeta, { color: iconColor }]} numberOfLines={1}>
              {list.listItemCount} {list.listItemCount === 1 ? 'member' : 'members'}
            </ThemedText>
          ) : null}
        </View>
        {mutation.isPending ? (
          <ActivityIndicator size="small" />
        ) : membership.isMember ? (
          <IconSymbol name="checkmark.circle.fill" size={22} color={semanticColors.repost} />
        ) : (
          <IconSymbol name="circle" size={22} color={iconColor} />
        )}
      </TouchableOpacity>
    </>
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
  scrollView: {
    maxHeight: 360,
  },
  loading: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  empty: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.base,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  rowMeta: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  divider: {
    height: layout.hairline,
    marginLeft: spacing.lg,
  },
  footerRow: {
    flexDirection: 'row',
    borderTopWidth: layout.hairline,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  footerButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  createForm: {
    borderTopWidth: layout.hairline,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  input: {
    borderWidth: layout.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: fontSize.base,
  },
  inputDescription: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  createActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  createSecondaryButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: layout.hairline,
  },
  createSecondaryText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  createPrimaryButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  createPrimaryDisabled: {
    opacity: 0.5,
  },
  createPrimaryText: {
    color: '#000000',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});
