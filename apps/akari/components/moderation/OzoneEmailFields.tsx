import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { fontSize, fontWeight, radius, spacing } from '@/constants/tokens';
import { type OzoneCommTemplate } from '@/hooks/queries/useOzoneCommTemplates';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Email-action fields: an optional template picker (prefills subject +
 * body) plus the subject line and Markdown body inputs.
 */
export function EmailFields({
  templates,
  emailSubject,
  onChangeEmailSubject,
  emailBody,
  onChangeEmailBody,
  borderColor,
  secondary,
  text,
}: {
  templates: OzoneCommTemplate[] | undefined;
  emailSubject: string;
  onChangeEmailSubject: (next: string) => void;
  emailBody: string;
  onChangeEmailBody: (next: string) => void;
  borderColor: string;
  secondary: string;
  text: string;
}) {
  const { t } = useTranslation();
  return (
    <>
      {templates && templates.length > 0 ? (
        <>
          <ThemedText style={[styles.sectionLabel, { color: secondary }]}>
            {t('moderation.actionSheet.template')}
          </ThemedText>
          <View style={styles.actionGrid}>
            {templates.map((tpl) => (
              <Pressable
                key={tpl.id}
                onPress={() => {
                  if (typeof tpl.subject === 'string') onChangeEmailSubject(tpl.subject);
                  if (typeof tpl.contentMarkdown === 'string') onChangeEmailBody(tpl.contentMarkdown);
                }}
                style={[styles.actionChip, { borderColor }]}
              >
                <ThemedText style={styles.actionChipLabel}>{tpl.name}</ThemedText>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
      <ThemedText style={[styles.sectionLabel, { color: secondary }]}>{t('moderation.actionSheet.emailSubject')}</ThemedText>
      <TextInput
        value={emailSubject}
        onChangeText={onChangeEmailSubject}
        placeholder="Email subject line"
        placeholderTextColor={secondary}
        style={[styles.input, { color: text, borderColor }]}
      />
      <ThemedText style={[styles.sectionLabel, { color: secondary }]}>{t('moderation.actionSheet.emailBody')}</ThemedText>
      <TextInput
        value={emailBody}
        onChangeText={onChangeEmailBody}
        placeholder="Email body (Markdown supported)"
        placeholderTextColor={secondary}
        multiline
        style={[styles.input, styles.inputMultiline, { color: text, borderColor }]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  actionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  actionChipLabel: {
    fontSize: fontSize.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.base,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
});
