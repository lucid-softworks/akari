import { Stack } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

import { Dialog } from '@/components/ui/Dialog';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { fontSize, fontWeight, spacing } from '@/constants/tokens';
import { webColumnSideBorders, webScreenContainer } from '@/constants/webStyles';
import { useDialogManager } from '@/contexts/DialogContext';
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
import { useTranslation } from '@/hooks/useTranslation';

const TEMPLATE_EDITOR_DIALOG_ID = 'mod-template-editor';

type TemplateEditorValues = {
  name: string;
  subject?: string;
  contentMarkdown: string;
};

/**
 * Comm-templates manager. Lists every template the labeler has on file
 * and lets admins create / edit / delete them. The action sheet's email
 * action consumes the same list as a picker, so changes here flow into
 * the moderation workflow immediately on invalidation.
 */
export default function TemplatesScreen() {
  const { t } = useTranslation();
  const borderColor = useBorderColor();
  const secondary = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const accent = useThemeColor({}, 'tint');
  const dangerColor = useThemeColor({ light: '#dc2626', dark: '#ef4444' }, 'tint');

  const { data: membership } = useOzoneMembership();
  const { data: templates } = useOzoneCommTemplates();
  const createMutation = useCreateOzoneTemplate();
  const updateMutation = useUpdateOzoneTemplate();
  const deleteMutation = useDeleteOzoneTemplate();

  const dialogManager = useDialogManager();

  // The editor used to be inlined with a `editing: OzoneCommTemplate | null`
  // state acting as both visibility flag and template data. We've migrated
  // open/close to DialogManager (so CenteredModal can drop its `visible`
  // prop); the template-being-edited is now passed straight into the
  // subcomponent as an argument to open().
  const openEditor = useCallback(
    (template: OzoneCommTemplate | null) => {
      const close = () => dialogManager.close(TEMPLATE_EDITOR_DIALOG_ID);
      const handleSave = async (values: TemplateEditorValues) => {
        if (template?.id) {
          await updateMutation.mutateAsync({
            id: template.id,
            name: values.name,
            subject: values.subject,
            contentMarkdown: values.contentMarkdown,
          });
        } else {
          await createMutation.mutateAsync({
            name: values.name,
            subject: values.subject,
            contentMarkdown: values.contentMarkdown,
          });
        }
        close();
      };
      dialogManager.open({
        id: TEMPLATE_EDITOR_DIALOG_ID,
        component: (
          <TemplateEditorModal
            template={template}
            onClose={close}
            onSave={handleSave}
          />
        ),
      });
    },
    [createMutation, dialogManager, updateMutation],
  );

  const startNew = () => openEditor(null);
  const startEdit = (tpl: OzoneCommTemplate) => openEditor(tpl);

  if (!membership?.isMod) {
    return (
      <ThemedView style={Platform.OS === 'web' ? webScreenContainer : styles.container}>
        <Stack.Screen options={{ title: t('moderation.templates.title') }} />
        <ThemedText style={[styles.placeholder, { color: secondary }]}>
          {t('moderation.templates.notModeratorPlaceholder')}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={Platform.OS === 'web' ? webScreenContainer : styles.container}>
      <Stack.Screen options={{ title: t('moderation.templates.title') }} />

      <View
        style={[
          styles.header,
          { borderBottomColor: borderColor },
          webColumnSideBorders(borderColor),
        ]}
      >
        <ThemedText style={styles.title}>{t('moderation.templates.heading')}</ThemedText>
        <Pressable
          onPress={startNew}
          style={({ pressed }) => [
            styles.primaryButton,
            { borderColor: accent },
            pressed && { opacity: 0.6 },
          ]}
        >
          <ThemedText style={[styles.primaryButtonLabel, { color: accent }]}>{t('moderation.templates.newTemplate')}</ThemedText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {templates && templates.length === 0 ? (
          <ThemedText style={[styles.placeholder, { color: secondary }]}>
            {t('moderation.templates.noTemplates')}
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
                  <ThemedText style={styles.smallButtonLabel}>{t('moderation.templates.edit')}</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => deleteMutation.mutate(tpl.id)}
                  style={({ pressed }) => [
                    styles.smallButton,
                    { borderColor: dangerColor },
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <ThemedText style={[styles.smallButtonLabel, { color: dangerColor }]}>{t('moderation.templates.delete')}</ThemedText>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

    </ThemedView>
  );
}

/**
 * Editor dialog for a single comm-template. Mounted via DialogManager
 * (see `openEditor` above), so its presence in the tree implies it
 * should render — CenteredModal no longer takes a `visible` prop.
 *
 * Owns its own draft state, seeded from the optional `template` prop
 * (null = "+ New template"). Calls `onSave` with the trimmed values and
 * leaves the actual create/update mutation + close to the caller.
 */
function TemplateEditorModal({
  template,
  onClose,
  onSave,
}: {
  template: OzoneCommTemplate | null;
  onClose: () => void;
  onSave: (values: TemplateEditorValues) => Promise<void>;
}) {
  const { t } = useTranslation();
  const borderColor = useBorderColor();
  const secondary = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const accent = useThemeColor({}, 'tint');

  const [draftName, setDraftName] = useState(template?.name ?? '');
  const [draftSubject, setDraftSubject] = useState(template?.subject ?? '');
  const [draftBody, setDraftBody] = useState(template?.contentMarkdown ?? '');
  const [saving, setSaving] = useState(false);

  const canSave = !!draftName.trim() && !!draftBody.trim() && !saving;

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        name: draftName.trim(),
        subject: draftSubject.trim() || undefined,
        contentMarkdown: draftBody,
      });
    } finally {
      setSaving(false);
    }
  }, [canSave, draftBody, draftName, draftSubject, onSave]);

  return (
    <Dialog keyboardAvoiding onClose={onClose} maxWidth={640} height="80%">
      <View style={styles.modalContents}>
        <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
          <ThemedText style={styles.modalTitle}>
            {template?.id ? t('moderation.templates.editTitle') : t('moderation.templates.newTitle')}
          </ThemedText>
          {template?.id ? (
            <ThemedText style={[styles.modalSubtitle, { color: secondary }]} numberOfLines={1}>
              {template.name}
            </ThemedText>
          ) : null}
        </View>

        <ScrollView style={styles.modalBodyScroll} contentContainerStyle={styles.modalBody}>
          <ThemedText style={[styles.fieldLabel, { color: secondary }]}>{t('moderation.templates.nameLabel')}</ThemedText>
          <Input
            containerStyle={styles.inputBox}
            value={draftName}
            onChangeText={setDraftName}
            placeholder="Internal label"
            placeholderTextColor={secondary}
          />
          <ThemedText style={[styles.fieldLabel, { color: secondary }]}>{t('moderation.templates.subjectLabel')}</ThemedText>
          <Input
            containerStyle={styles.inputBox}
            value={draftSubject}
            onChangeText={setDraftSubject}
            placeholder="(optional)"
            placeholderTextColor={secondary}
          />
          <ThemedText style={[styles.fieldLabel, { color: secondary }]}>{t('moderation.templates.bodyLabel')}</ThemedText>
          <Textarea
            containerStyle={styles.inputBox}
            minHeight={120}
            value={draftBody}
            onChangeText={setDraftBody}
            placeholder="Hi {{handle}},&#10;&#10;..."
            placeholderTextColor={secondary}
          />
        </ScrollView>

        <View style={[styles.modalFooter, { borderTopColor: borderColor }]}>
          <Pressable
            onPress={onClose}
            disabled={saving}
            style={[styles.footerButton, { borderColor }]}
          >
            <ThemedText style={styles.footerButtonLabel}>{t('moderation.templates.cancel')}</ThemedText>
          </Pressable>
          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            style={[
              styles.footerButton,
              styles.footerButtonPrimary,
              { backgroundColor: accent },
              !canSave && { opacity: 0.6 },
            ]}
          >
            <ThemedText style={[styles.footerButtonLabel, styles.footerButtonLabelPrimary]}>
              {saving ? t('moderation.templates.saving') : t('moderation.templates.save')}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Dialog>
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
  inputBox: {
    borderRadius: 6,
  },
  placeholder: {
    fontSize: fontSize.base,
    padding: spacing.lg,
    textAlign: 'center',
  },
});
