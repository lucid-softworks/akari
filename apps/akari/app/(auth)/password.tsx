import { Redirect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { fontSize, fontWeight, opacity, radius, semanticColors, spacing } from '@/constants/tokens';
import { ThemedText } from '@/components/ThemedText';
import { AppPasswordHelpModal } from '@/components/auth/AppPasswordHelpModal';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { CredentialsForm } from '@/components/auth/CredentialsForm';
import { HandleSuggestionsDropdown } from '@/components/auth/HandleSuggestionsDropdown';
import { useTypeaheadActors } from '@/hooks/queries/useTypeaheadActors';
import { useAppPasswordSignIn } from '@/hooks/useAppPasswordSignIn';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

export default function AuthScreen() {
  const { t } = useTranslation();

  const [handle, setHandle] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const { signIn, redirectAfterAuth, isLoading, hasCurrentAccount } = useAppPasswordSignIn();

  const handleInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const [showAppPasswordHelp, setShowAppPasswordHelp] = useState(false);
  // Closes the typeahead dropdown after the user picks a suggestion. Selecting
  // a result fills the handle field with the full handle, which would otherwise
  // re-trigger the query and immediately re-show the same list.
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const { data: typeaheadResults } = useTypeaheadActors(handle);
  const showSuggestions = typeaheadResults.length > 0 && !suggestionsDismissed;

  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#1F212D' }, 'border');
  const labelColor = useThemeColor({ light: '#374151', dark: '#E2E8F0' }, 'text');
  const helperColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const inputBackground = useThemeColor({ light: '#ffffff', dark: '#111827' }, 'background');
  const suggestionBackground = useThemeColor({ light: '#ffffff', dark: '#15181c' }, 'background');
  const screenBackground = useThemeColor({}, 'background');

  const handleSelectSuggestion = useCallback((suggestedHandle: string) => {
    setHandle(suggestedHandle);
    setSuggestionsDismissed(true);
    // Focus the password field next so the user can finish entering credentials
    // without an extra tap after picking from the dropdown.
    passwordInputRef.current?.focus();
  }, []);

  const handleHandleChange = useCallback((value: string) => {
    setHandle(value);
    setSuggestionsDismissed(false);
  }, []);

  // Render the typeahead dropdown as a sibling of ScrollView so it escapes
  // the form's stacking context (RN-Web's atomic CSS made the in-flow +
  // zIndex approach unreliable, the App Password input kept painting on
  // top despite a computed z-index of 9999). On web we use `position:
  // fixed` so coordinates match `measureInWindow`'s viewport reference; on
  // native we fall back to `position: absolute` *inside* the container,
  // which means we have to subtract the container's window offset (status
  // bar / nav header push the container down on iOS) so the dropdown
  // actually lands directly under the input.
  const inputAnchorRef = useRef<View>(null);
  // KeyboardAvoidingView doesn't expose measureInWindow, so wrap its
  // children in a plain View we can ref + measure.
  const containerRef = useRef<View>(null);
  const [anchorRect, setAnchorRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const measureAnchor = useCallback(() => {
    if (!inputAnchorRef.current) return;
    inputAnchorRef.current.measureInWindow((inputX, inputY, width, height) => {
      if (Platform.OS === 'web' || !containerRef.current) {
        setAnchorRect({ x: inputX, y: inputY, width, height });
        return;
      }
      containerRef.current.measureInWindow((containerX, containerY) => {
        setAnchorRect({
          x: inputX - containerX,
          y: inputY - containerY,
          width,
          height,
        });
      });
    });
  }, []);

  useEffect(() => {
    if (showSuggestions) measureAnchor();
  }, [showSuggestions, measureAnchor, typeaheadResults.length]);

  const submitAuth = () => {
    if (isLoading) {
      return;
    }
    void signIn(handle, appPassword);
  };

  const primaryButtonLabel = useMemo(() => {
    if (isLoading) {
      return hasCurrentAccount ? t('auth.addingAccount') : t('auth.signingIn');
    }

    return hasCurrentAccount ? t('common.addAccount') : t('common.signIn');
  }, [hasCurrentAccount, isLoading, t]);

  if (redirectAfterAuth) {
    return <Redirect href={redirectAfterAuth as never} />;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: screenBackground }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View ref={containerRef} style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <AuthHeader helperColor={helperColor} />
            <CredentialsForm
              handle={handle}
              appPassword={appPassword}
              handleInputRef={handleInputRef}
              passwordInputRef={passwordInputRef}
              inputAnchorRef={inputAnchorRef}
              colors={{ borderColor, labelColor, helperColor, inputBackground }}
              onHandleChange={handleHandleChange}
              onAppPasswordChange={setAppPassword}
              onPasswordFocus={() => setSuggestionsDismissed(true)}
              onSubmit={submitAuth}
              onAnchorLayout={measureAnchor}
              onHelpPress={() => setShowAppPasswordHelp(true)}
            />

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                isLoading ? styles.buttonDisabled : null,
                pressed && { opacity: 0.7 },
              ]}
              onPress={submitAuth}
              disabled={isLoading}
            >
              <ThemedText style={styles.primaryButtonText}>{primaryButtonLabel}</ThemedText>
            </Pressable>
          </View>
        </ScrollView>

        <AppPasswordHelpModal
          visible={showAppPasswordHelp}
          onClose={() => setShowAppPasswordHelp(false)}
        />

        {/*
          Typeahead dropdown rendered as a sibling of the ScrollView (not inside
          a Modal) so it sits at the screen root in the same stacking context as
          the form, but with `pointerEvents="box-none"` on the overlay layer so
          clicks fall through to the form input behind it (otherwise typing
          would defocus the input on web). Using a Modal instead steals focus
          via aria-modal and breaks typing. The anchor rect is measured from
          `inputAnchorRef` and used to absolutely position the dropdown
          directly under the input.
        */}
        {showSuggestions && anchorRect ? (
          <HandleSuggestionsDropdown
            results={typeaheadResults}
            anchorRect={anchorRect}
            borderColor={borderColor}
            helperColor={helperColor}
            suggestionBackground={suggestionBackground}
            onSelect={handleSelectSuggestion}
          />
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    gap: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    width: '100%',
    maxWidth: 480,
  },
  primaryButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: semanticColors.systemBlue,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  buttonDisabled: {
    opacity: opacity.disabled,
  },
});
