import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { CenteredModal } from '@/components/ui/CenteredModal';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { fontSize, fontWeight, spacing } from '@/constants/tokens';
import { webColumnSideBorders, webScreenContainer } from '@/constants/webStyles';
import {
  useCreateOzoneTemplate,
  useDeleteOzoneTemplate,
  useUpdateOzoneTemplate,
} from '@/hooks/mutations/useOzoneTemplateMutations';
import {
  useOzoneCommTemplates,
  type OzoneCommTemplate,
} from '@/hooks/queries/useOzoneCommTemplates';
import { useOzoneMembership } from '@/hooks/queries/useOzoneMembership';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';

/**
 * Comm-templates manager. Lists every template the labeler has on file
 * and lets admins create / edit / delete them. The action sheet's email
 * action consumes the same list as a picker, so changes here flow into
 * the moderation workflow immediately on invalidation.
 */
export default function TemplatesScreen() {
  const borderColor = useBorderColor();
  const secondary = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const accent = useThemeColor({}, 'tint');
  const dangerColor = useThemeColor({ light: '#dc2626', dark: '#ef4444' }, 'tint');
  const inputBg = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const textColor = useThemeColor({}, 'text');

  const { data: membership } = useOzoneMembership();
  const { data: templates } = useOzoneCommTemplates();
  const createMutation = useCreateOzoneTemplate();
  const updateMutation = useUpdateOzoneTemplate();
  const deleteMutation = useDeleteOzoneTemplate();

  const [editing, setEditing] = useState<OzoneCommTemplate | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftSubject, setDraftSubject] = useState('');
  const [draftBody, setDraftBody] = useState('');

  const startNew = () => {
    setEditing({ id: '', name: '' });
    setDraftName('');
    setDraftSubject('');
    setDraftBody('');
  };
  const startEdit = (tpl: OzoneCommTemplate) => {
    setEditing(tpl);
    setDraftName(tpl.name ?? '');
    setDraftSubject(tpl.subject ?? '');
    setDraftBody(tpl.contentMarkdown ?? '');
  };
  const cancelEdit = () => setEditing(null);

  const save = async () => {
    if (!editing) return;
    if (!draftName.trim() || !draftBody.trim()) return;
    if (editing.id) {
      await updateMutation.mutateAsync({
        id: editing.id,
        name: draftName.trim(),
        subject: draftSubject.trim() || undefined,
        contentMarkdown: draftBody,
      });
    } else {
      await createMutation.mutateAsync({
        name: draftName.trim(),
        subject: draftSubject.trim() || undefined,
        contentMarkdown: draftBody,
      });
    }
    setEditing(null);
  };

  if (!membership?.isMod) {
    return (
      <ThemedView style={Platform.OS === 'web' ? webScreenContainer : styles.container}>
        <Stack.Screen options={{ title: 'Templates' }} />
        <ThemedText style={[styles.placeholder, { color: secondary }]}>
          You are not a moderator on the configured Ozone service.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={Platform.OS === 'web' ? webScreenContainer : styles.container}>
      <Stack.Screen options={{ title: 'Templates' }} />

      <View
        style={[
          styles.header,
          { borderBottomColor: borderColor },
          webColumnSideBorders(borderColor),
        ]}
      >
        <ThemedText style={styles.title}>Communication templates</ThemedText>
        <Pressable
          onPress={startNew}
          style={({ pressed }) => [
            styles.primaryButton,
            { borderColor: accent },
            pressed && { opacity: 0.6 },
          ]}
        >
          <ThemedText style={[styles.primaryButtonLabel, { color: accent }]}>+ New template</ThemedText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {templates && templates.length === 0 ? (
          <ThemedText style={[styles.placeholder, { color: secondary }]}>
            No templates yet — create one to use the email action.
          </ThemedText>
        ) : (
          (templates ?? []).map((tpl) => (
            <View
              key={tpl.id}
              style={[styles.row, { borderBottomColor: borderColor }, webColumnSideBorders(borderColor)]}
            >
              <View style={styles.rowBody}>
                <ThemedText style={styles.rowTitle}>{tpl.name}</ThemedText>
                {tpl.subject ? (
                  <ThemedText style={[styles.rowSubtitle, { color: secondary }]} numberOfLines={1}>
                    {tpl.subject}
                  </ThemedText>
                ) : null}
                {tpl.contentMarkdown ? (
                  <ThemedText style={[styles.rowExcerpt, { color: secondary }]} numberOfLines={3}>
                    {tpl.contentMarkdown}
                  </ThemedText>
                ) : null}
              </View>
              <View style={styles.rowActions}>
                <Pressable
                  onPress={() => startEdit(tpl)}
                  style={({ pressed }) => [
                    styles.smallButton,
                    { borderColor },
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <ThemedText style={styles.smallButtonLabel}>Edit</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => deleteMutation.mutate(tpl.id)}
                  style={({ pressed }) => [
                    styles.smallButton,
                    { borderColor: dangerColor },
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <ThemedText style={[styles.smallButtonLabel, { color: dangerColor }]}>Delete</ThemedText>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <CenteredModal
        visible={!!editing}
        onClose={cancelEdit}
        maxWidth={640}
        height="80%"
      >
        <View style={styles.modalContents}>
          <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
            <ThemedText style={styles.modalTitle}>
              {editing?.id ? 'Edit template' : 'New template'}
            </ThemedText>
            {editing?.id ? (
              <ThemedText style={[styles.modalSubtitle, { color: secondary }]} numberOfLines={1}>
                {editing.name}
              </ThemedText>
            ) : null}
          </View>

          <ScrollView style={styles.modalBodyScroll} contentContainerStyle={styles.modalBody}>
            <ThemedText style={[styles.fieldLabel, { color: secondary }]}>Name</ThemedText>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Internal label"
              placeholderTextColor={secondary}
              style={[styles.input, { borderColor, color: textColor, backgroundColor: inputBg }]}
            />
            <ThemedText style={[styles.fieldLabel, { color: secondary }]}>Email subject</ThemedText>
            <TextInput
              value={draftSubject}
              onChangeText={setDraftSubject}
              placeholder="(optional)"
              placeholderTextColor={secondary}
              style={[styles.input, { borderColor, color: textColor, backgroundColor: inputBg }]}
            />
            <ThemedText style={[styles.fieldLabel, { color: secondary }]}>Body (Markdown)</ThemedText>
            <TextInput
              value={draftBody}
              onChangeText={setDraftBody}
              placeholder="Hi {{handle}},&#10;&#10;..."
              placeholderTextColor={secondary}
              multiline
              style={[
                styles.input,
                styles.inputMultiline,
                { borderColor, color: textColor, backgroundColor: inputBg },
              ]}
            />
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: borderColor }]}>
            <Pressable
              onPress={cancelEdit}
              disabled={createMutation.isPending || updateMutation.isPending}
              style={[styles.footerButton, { borderColor }]}
            >
              <ThemedText style={styles.footerButtonLabel}>Cancel</ThemedText>
            </Pressable>
            <Pressable
              onPress={save}
              disabled={
                !draftName.trim() ||
                !draftBody.trim() ||
                createMutation.isPending ||
                updateMutation.isPending
              }
              style={[
                styles.footerButton,
                styles.footerButtonPrimary,
                { backgroundColor: accent },
                (!draftName.trim() ||
                  !draftBody.trim() ||
                  createMutation.isPending ||
                  updateMutation.isPending) && { opacity: 0.6 },
              ]}
            >
              <ThemedText style={[styles.footerButtonLabel, styles.footerButtonLabelPrimary]}>
                {createMutation.isPending || updateMutation.isPending ? 'Saving…' : 'Save'}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </CenteredModal>
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
    borderBottomWidth: 1,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  primaryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
    borderWidth: 1,
  },
  primaryButtonLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  list: {
    paddingBottom: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  rowTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  rowSubtitle: {
    fontSize: fontSize.sm,
  },
  rowExcerpt: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  rowActions: {
    gap: spacing.xs,
  },
  smallButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
  },
  smallButtonLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  modalContents: {
    flex: 1,
  },
  modalHeader: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    gap: spacing.xs,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
  },
  modalSubtitle: {
    fontSize: fontSize.sm,
  },
  modalBodyScroll: {
    flex: 1,
  },
  modalBody: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonPrimary: {
    borderColor: 'transparent',
  },
  footerButtonLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  footerButtonLabelPrimary: {
    color: '#ffffff',
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.base,
  },
  inputMultiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  placeholder: {
    fontSize: fontSize.base,
    padding: spacing.lg,
    textAlign: 'center',
  },
});
