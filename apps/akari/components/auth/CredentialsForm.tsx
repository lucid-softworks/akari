import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { fontSize, fontWeight, hitSlop, layout, spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

type CredentialsFormColors = {
  borderColor: string;
  labelColor: string;
  helperColor: string;
  inputBackground: string;
};

type CredentialsFormProps = {
  handle: string;
  appPassword: string;
  handleInputRef: React.RefObject<TextInput | null>;
  passwordInputRef: React.RefObject<TextInput | null>;
  inputAnchorRef: React.RefObject<View | null>;
  colors: CredentialsFormColors;
  onHandleChange: (value: string) => void;
  onAppPasswordChange: (value: string) => void;
  onPasswordFocus: () => void;
  onSubmit: () => void;
  onAnchorLayout: () => void;
  onHelpPress: () => void;
};

export function CredentialsForm({
  handle,
  appPassword,
  handleInputRef,
  passwordInputRef,
  inputAnchorRef,
  colors,
  onHandleChange,
  onAppPasswordChange,
  onPasswordFocus,
  onSubmit,
  onAnchorLayout,
  onHelpPress,
}: CredentialsFormProps) {
  const { t } = useTranslation();
  const { borderColor, labelColor, helperColor, inputBackground } = colors;

  return (
    <View style={styles.form}>
      <View style={styles.inputContainer}>
        <ThemedText style={[styles.label, { color: labelColor }]}>{t('auth.blueskyHandle')}</ThemedText>
        <View ref={inputAnchorRef} style={styles.inputAnchor} onLayout={onAnchorLayout}>
          <TextInput
            ref={handleInputRef}
            style={[styles.input, { borderColor, backgroundColor: inputBackground, color: labelColor }]}
            value={handle}
            onChangeText={onHandleChange}
            placeholder={t('auth.blueskyHandlePlaceholder')}
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            returnKeyType="next"
            onSubmitEditing={() => passwordInputRef.current?.focus()}
          />
        </View>
        <ThemedText style={[styles.helperText, { color: helperColor }]}>
          {t('auth.handleHelperText')}
        </ThemedText>
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.labelRow}>
          <ThemedText style={[styles.label, { color: labelColor }]}>{t('auth.appPassword')}</ThemedText>
          <Pressable
            onPress={onHelpPress}
            accessibilityRole="button"
            accessibilityLabel={t('auth.howToGetAppPassword')}
            hitSlop={hitSlop}
            style={({ pressed }) => pressed && { opacity: 0.7 }}
          >
            <IconSymbol name="questionmark.circle" size={18} color={helperColor} />
          </Pressable>
        </View>
        <TextInput
          ref={passwordInputRef}
          style={[styles.input, { borderColor, backgroundColor: inputBackground, color: labelColor }]}
          value={appPassword}
          onChangeText={onAppPasswordChange}
          onFocus={onPasswordFocus}
          placeholder={t('auth.appPasswordPlaceholder')}
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />
        <ThemedText style={[styles.helperText, { color: helperColor }]}>
          {t('auth.appPasswordHelperText')}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.xl,
  },
  inputContainer: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    borderWidth: layout.border,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.lg,
  },
  helperText: {
    fontSize: fontSize.sm,
  },
  inputAnchor: {
    // Anchors the absolutely-positioned suggestions list below the input so
    // the dropdown overlays the helper text and password field instead of
    // pushing the layout around as the user types.
    //
    // The transform + zIndex combo is what actually wins on web: zIndex
    // alone is unreliable because RN-Web's atomic CSS hashes the property
    // value into a class name that HMR can leave stale rules for. A
    // no-op `translateY: 0` forces the browser to create a fresh stacking
    // context here regardless, so the absolute-positioned dropdown
    // descendant always paints above sibling form sections (App Password
    // input etc). Native just respects the child zIndex.
    position: 'relative',
    zIndex: 9999,
    transform: [{ translateY: 0 }],
  },
});
