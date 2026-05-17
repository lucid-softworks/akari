import { Image } from '@/components/Image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { VerificationBadge } from '@/components/VerificationBadge';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, radius, fontSize, fontWeight, layout, activeOpacity, semanticColors } from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import {
  useLeaveConvo,
  useRemoveConvoMembers,
  useUpdateConvoName,
} from '@/hooks/mutations/useGroupConvo';
import { useConversations } from '@/hooks/queries/useConversations';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { useNavigateToProfile } from '@/utils/navigation';

export default function ConvoSettingsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const navigateToProfile = useNavigateToProfile();
  const { convoId } = useLocalSearchParams<{ convoId: string }>();
  const decodedConvoId = decodeURIComponent(convoId ?? '');

  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'text');
  const textColor = useThemeColor({}, 'text');
  const inputBg = useThemeColor({ light: '#f5f5f5', dark: '#1f2123' }, 'background');
  const tintColor = useThemeColor({}, 'tint');

  const { data: conversationsData } = useConversations();
  const conversation = conversationsData?.pages
    .flatMap((p) => p.conversations)
    .find((c) => c.convoId === decodedConvoId);

  const isGroup = !!conversation?.isGroup;
  const initialName = useMemo(
    () =>
      conversation?.isGroup
        ? conversation.members.map((m) => m.displayName || m.handle).join(', ')
        : (conversation?.displayName ?? ''),
    [conversation],
  );
  const [nameDraft, setNameDraft] = useState(initialName);

  const updateName = useUpdateConvoName();
  const removeMembers = useRemoveConvoMembers();
  const leaveConvo = useLeaveConvo();

  const handleSaveName = useCallback(() => {
    const trimmed = nameDraft.trim();
    if (!trimmed || !decodedConvoId || trimmed === initialName) return;
    updateName.mutate(
      { convoId: decodedConvoId, name: trimmed },
      {
        onSuccess: () => showToast({ message: t('messages.groupRenamed'), type: 'success' }),
        onError: () => showToast({ message: t('common.error'), type: 'error' }),
      },
    );
  }, [nameDraft, decodedConvoId, initialName, updateName, showToast, t]);

  const handleRemoveMember = useCallback(
    (did: string, name: string) => {
      Alert.alert(t('messages.removeMember'), t('messages.removeMemberConfirm', { name }), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('messages.remove'),
          style: 'destructive',
          onPress: () => {
            removeMembers.mutate(
              { convoId: decodedConvoId, dids: [did] },
              {
                onError: () => showToast({ message: t('common.error'), type: 'error' }),
              },
            );
          },
        },
      ]);
    },
    [decodedConvoId, removeMembers, showToast, t],
  );

  const handleLeave = useCallback(() => {
    Alert.alert(t('messages.leaveChat'), t('messages.leaveChatConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('messages.leave'),
        style: 'destructive',
        onPress: () => {
          leaveConvo.mutate(
            { convoId: decodedConvoId },
            {
              onSuccess: () => router.back(),
              onError: () => showToast({ message: t('common.error'), type: 'error' }),
            },
          );
        },
      },
    ]);
  }, [decodedConvoId, leaveConvo, showToast, t]);

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => pressed && { opacity: 0.7 }}>
          <ThemedText style={[styles.headerAction, { color: iconColor }]}>{t('common.cancel')}</ThemedText>
        </Pressable>
        <ThemedText style={[styles.title, { color: textColor }]}>
          {isGroup ? t('messages.groupSettings') : t('messages.chatSettings')}
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentInset={{ bottom: insets.bottom + spacing.xxl }}
        contentInsetAdjustmentBehavior="never"
      >
        {isGroup ? (
          <>
            <View style={styles.section}>
              <ThemedText style={[styles.sectionLabel, { color: iconColor }]}>
                {t('messages.groupName')}
              </ThemedText>
              <View style={styles.nameRow}>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  maxLength={64}
                  placeholder={t('messages.groupName')}
                  placeholderTextColor={iconColor}
                />
                <Pressable
                  style={({ pressed }) => [styles.saveButton,
                    { backgroundColor: tintColor },
                    (!nameDraft.trim() || nameDraft.trim() === initialName || updateName.isPending) && {
                      opacity: 0.5,
                    }, pressed && { opacity: activeOpacity.default }]}
                  onPress={handleSaveName}
                  disabled={!nameDraft.trim() || nameDraft.trim() === initialName || updateName.isPending}
                  
                >
                  {updateName.isPending ? (
                    <ActivityIndicator color="#000000" />
                  ) : (
                    <ThemedText style={styles.saveButtonText}>{t('common.save')}</ThemedText>
                  )}
                </Pressable>
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText style={[styles.sectionLabel, { color: iconColor }]}>
                {t('messages.members')}
              </ThemedText>
              <View style={[styles.memberList, { borderColor }]}>
                {conversation?.members.map((member, idx) => (
                  <View key={member.did}>
                    {idx > 0 ? <View style={[styles.divider, { backgroundColor: borderColor }]} /> : null}
                    <View style={styles.memberRow}>
                      <Pressable
                        style={({ pressed }) => [styles.memberPress, pressed && { opacity: activeOpacity.default }]}
                        onPress={() => navigateToProfile({ actor: member.handle })}
                        
                      >
                        {member.avatar ? (
                          <Image source={{ uri: member.avatar }} style={styles.memberAvatar} />
                        ) : (
                          <View style={[styles.memberAvatar, { backgroundColor: borderColor }]} />
                        )}
                        <View style={styles.memberText}>
                          <View style={styles.memberNameRow}>
                            <ThemedText style={[styles.memberName, { color: textColor }]} numberOfLines={1}>
                              {member.displayName || member.handle}
                            </ThemedText>
                            <VerificationBadge
                              verification={member.verification}
                              subjectHandle={member.handle}
                              subjectDisplayName={member.displayName}
                              size={14}
                            />
                          </View>
                          <ThemedText style={[styles.memberHandle, { color: iconColor }]} numberOfLines={1}>
                            @{member.handle}
                          </ThemedText>
                        </View>
                      </Pressable>
                      <Pressable
                        onPress={() => handleRemoveMember(member.did, member.displayName || member.handle)}
                        hitSlop={12}
                        accessibilityLabel={t('messages.removeMember')} style={({ pressed }) => pressed && { opacity: 0.7 }}>
                        <IconSymbol name="minus.circle" size={22} color={semanticColors.danger} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : null}

        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [styles.dangerButton, { borderColor: semanticColors.danger }, pressed && { opacity: activeOpacity.default }]}
            onPress={handleLeave}
            disabled={leaveConvo.isPending}
            
          >
            {leaveConvo.isPending ? (
              <ActivityIndicator color={semanticColors.danger} />
            ) : (
              <ThemedText style={[styles.dangerButtonText, { color: semanticColors.danger }]}>
                {isGroup ? t('messages.leaveChat') : t('messages.deleteChat')}
              </ThemedText>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
  },
  headerAction: { fontSize: fontSize.lg },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  headerSpacer: { width: 60 },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nameRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: layout.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: fontSize.base,
  },
  saveButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
  },
  saveButtonText: {
    color: '#000000',
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.base,
  },
  memberList: {
    borderWidth: layout.hairline,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  memberPress: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  memberText: { flex: 1 },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  memberName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    flexShrink: 1,
  },
  memberHandle: {
    fontSize: fontSize.sm,
  },
  divider: {
    height: layout.hairline,
    marginLeft: spacing.lg,
  },
  dangerButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: layout.hairline,
  },
  dangerButtonText: {
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.base,
  },
});
