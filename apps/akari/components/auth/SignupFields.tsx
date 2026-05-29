import React, { type RefObject } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Input } from '@/components/ui/Input';
import { Menu, MenuTrigger, type MenuItem } from '@/components/ui/Menu';
import {
  activeOpacity,
  fontSize,
  fontWeight,
  radius,
  semanticColors,
  spacing,
} from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

type SignupFieldsProps = {
  isCustom: boolean;
  hasSuffixChoice: boolean;
  handleSuffix: string;
  suffixItems: readonly MenuItem[];
  providerItems: readonly MenuItem[];
  providerDisplayLabel: string;
  customPdsUrl: string;
  onChangeCustomPdsUrl: (value: string) => void;
  email: string;
  onChangeEmail: (value: string) => void;
  password: string;
  onChangePassword: (value: string) => void;
  handle: string;
  onChangeHandle: (value: string) => void;
  inviteCode: string;
  onChangeInviteCode: (value: string) => void;
  showInviteCode: boolean;
  onShowInviteCode: () => void;
  onSubmit: () => void;
  passwordInputRef: RefObject<TextInput | null>;
  handleInputRef: RefObject<TextInput | null>;
  inviteInputRef: RefObject<TextInput | null>;
  customPdsUrlInputRef: RefObject<TextInput | null>;
  borderColor: string;
  labelColor: string;
  helperColor: string;
  inputBackground: string;
};

export function SignupFields({
  isCustom,
  hasSuffixChoice,
  handleSuffix,
  suffixItems,
  providerItems,
  providerDisplayLabel,
  customPdsUrl,
  onChangeCustomPdsUrl,
  email,
  onChangeEmail,
  password,
  onChangePassword,
  handle,
  onChangeHandle,
  inviteCode,
  onChangeInviteCode,
  showInviteCode,
  onShowInviteCode,
  onSubmit,
  passwordInputRef,
  handleInputRef,
  inviteInputRef,
  customPdsUrlInputRef,
  borderColor,
  labelColor,
  helperColor,
  inputBackground,
}: SignupFieldsProps) {
  const { t } = useTranslation();

  const handleSuffixSlot = hasSuffixChoice ? (
    <Menu items={suffixItems}>
      <MenuTrigger
        style={({ pressed }) => [
          styles.suffixTrigger,
          pressed && { opacity: activeOpacity.default },
        ]}
      >
        <ThemedText style={[styles.suffixLabel, { color: helperColor }]}>
          {handleSuffix}
        </ThemedText>
        <IconSymbol name="chevron.down" size={12} color={helperColor} />
      </MenuTrigger>
    </Menu>
  ) : (
    <ThemedText style={[styles.suffixLabel, { color: helperColor }]}>
      {handleSuffix}
    </ThemedText>
  );

  return (
    <View style={styles.fields}>
      <View style={styles.field}>
        <ThemedText style={[styles.label, { color: labelColor }]}>
          {t('auth.signupServer')}
        </ThemedText>
        <Menu items={providerItems}>
          <MenuTrigger
            style={({ pressed }) => [
              styles.dropdownTrigger,
              { borderColor, backgroundColor: inputBackground },
              pressed && { opacity: activeOpacity.default },
            ]}
          >
            <ThemedText style={[styles.dropdownTriggerLabel, { color: labelColor }]}>
              {providerDisplayLabel}
            </ThemedText>
            <IconSymbol name="chevron.down" size={14} color={helperColor} />
          </MenuTrigger>
        </Menu>
      </View>

      {isCustom ? (
        <View style={styles.field}>
          <ThemedText style={[styles.label, { color: labelColor }]}>
            {t('auth.signupCustomPdsUrl')}
          </ThemedText>
          <Input
            ref={customPdsUrlInputRef}
            value={customPdsUrl}
            onChangeText={onChangeCustomPdsUrl}
            placeholder={t('auth.signupCustomPdsUrlPlaceholder')}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
          <ThemedText style={[styles.helper, { color: helperColor }]}>
            {t('auth.signupCustomPdsUrlHelper')}
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.field}>
        <ThemedText style={[styles.label, { color: labelColor }]}>
          {t('auth.signupEmail')}
        </ThemedText>
        <Input
          value={email}
          onChangeText={onChangeEmail}
          placeholder={t('auth.signupEmailPlaceholder')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => passwordInputRef.current?.focus()}
        />
      </View>

      <View style={styles.field}>
        <ThemedText style={[styles.label, { color: labelColor }]}>
          {t('auth.signupPassword')}
        </ThemedText>
        <Input
          ref={passwordInputRef}
          value={password}
          onChangeText={onChangePassword}
          placeholder={t('auth.signupPasswordPlaceholder')}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => handleInputRef.current?.focus()}
        />
      </View>

      <View style={styles.field}>
        <ThemedText style={[styles.label, { color: labelColor }]}>
          {t('auth.signupHandle')}
        </ThemedText>
        {isCustom ? (
          <Input
            ref={handleInputRef}
            value={handle}
            onChangeText={onChangeHandle}
            placeholder={t('auth.signupCustomHandlePlaceholder')}
            autoCapitalize="none"
            autoComplete="username"
            autoCorrect={false}
            returnKeyType={showInviteCode ? 'next' : 'go'}
            onSubmitEditing={() => {
              if (showInviteCode) inviteInputRef.current?.focus();
              else onSubmit();
            }}
          />
        ) : (
          <Input
            ref={handleInputRef}
            value={handle}
            onChangeText={onChangeHandle}
            placeholder={t('auth.signupHandlePlaceholder')}
            autoCapitalize="none"
            autoComplete="username"
            autoCorrect={false}
            returnKeyType={showInviteCode ? 'next' : 'go'}
            onSubmitEditing={() => {
              if (showInviteCode) inviteInputRef.current?.focus();
              else onSubmit();
            }}
            suffix={handleSuffixSlot}
          />
        )}
        <ThemedText style={[styles.helper, { color: helperColor }]}>
          {isCustom ? t('auth.signupCustomHandleHelper') : t('auth.signupHandleHelper')}
        </ThemedText>
      </View>

      {showInviteCode ? (
        <View style={styles.field}>
          <ThemedText style={[styles.label, { color: labelColor }]}>
            {t('auth.signupInviteCode')}
          </ThemedText>
          <Input
            ref={inviteInputRef}
            value={inviteCode}
            onChangeText={onChangeInviteCode}
            placeholder={t('auth.signupInviteCodePlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={onSubmit}
          />
        </View>
      ) : (
        <Pressable
          onPress={onShowInviteCode}
          accessibilityRole="button"
          style={({ pressed }) => pressed && { opacity: activeOpacity.default }}
        >
          <ThemedText style={styles.inlineLink}>{t('auth.signupInviteCodeToggle')}</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fields: { gap: spacing.lg },
  field: { gap: spacing.xs },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dropdownTriggerLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  suffixTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: spacing.xs,
    paddingVertical: spacing.xs,
  },
  suffixLabel: {
    fontSize: fontSize.base,
  },
  helper: {
    fontSize: fontSize.sm,
  },
  inlineLink: {
    color: semanticColors.systemBlue,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
