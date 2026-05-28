import { StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ChipMultiSelect } from '@/components/moderation/OzoneChipMultiSelect';
import { fontSize, fontWeight, radius, spacing } from '@/constants/tokens';

/**
 * Paired "add" / "remove" multi-select + free-text CSV fields. Shared by
 * the `label` and `tag` actions, which have identical shapes (an option
 * set plus an "other, comma-separated" escape hatch on each side).
 */
export function AddRemoveFields({
  addLabel,
  removeLabel,
  otherPlaceholder,
  options,
  selectedAdd,
  onChangeAdd,
  selectedRemove,
  onChangeRemove,
  addOther,
  onChangeAddOther,
  removeOther,
  onChangeRemoveOther,
  borderColor,
  secondary,
  tint,
  text,
}: {
  addLabel: string;
  removeLabel: string;
  otherPlaceholder: string;
  options: string[];
  selectedAdd: Set<string>;
  onChangeAdd: (next: Set<string>) => void;
  selectedRemove: Set<string>;
  onChangeRemove: (next: Set<string>) => void;
  addOther: string;
  onChangeAddOther: (next: string) => void;
  removeOther: string;
  onChangeRemoveOther: (next: string) => void;
  borderColor: string;
  secondary: string;
  tint: string;
  text: string;
}) {
  return (
    <>
      <ThemedText style={[styles.sectionLabel, { color: secondary }]}>{addLabel}</ThemedText>
      <ChipMultiSelect
        options={options}
        selected={selectedAdd}
        onChange={onChangeAdd}
        borderColor={borderColor}
        secondary={secondary}
        tint={tint}
      />
      <TextInput
        value={addOther}
        onChangeText={onChangeAddOther}
        placeholder={otherPlaceholder}
        placeholderTextColor={secondary}
        style={[styles.input, { color: text, borderColor }]}
      />
      <ThemedText style={[styles.sectionLabel, { color: secondary }]}>{removeLabel}</ThemedText>
      <ChipMultiSelect
        options={options}
        selected={selectedRemove}
        onChange={onChangeRemove}
        borderColor={borderColor}
        secondary={secondary}
        tint={tint}
      />
      <TextInput
        value={removeOther}
        onChangeText={onChangeRemoveOther}
        placeholder={otherPlaceholder}
        placeholderTextColor={secondary}
        style={[styles.input, { color: text, borderColor }]}
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
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.base,
  },
});
