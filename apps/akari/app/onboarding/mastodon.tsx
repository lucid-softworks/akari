import { Redirect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvatarOrInitial } from '@/components/AvatarOrInitial';
import { Image } from '@/components/Image';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { fontSize, fontWeight, opacity, radius, semanticColors, spacing } from '@/constants/tokens';
import { useMastodonOwnAccount } from '@/hooks/queries/useMastodonOwnAccount';
import { useMastodonProfileUpdate } from '@/hooks/mutations/useMastodonProfileUpdate';
import { useConfirm } from '@/hooks/useConfirm';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import type { MastodonProfileImage } from '@/utils/mastodon/profile';

/**
 * Convert an `expo-image-picker` asset into the shape `updateMastodonProfile`'s
 * multipart body expects. On native, FormData accepts `{ uri, name, type }`
 * directly (RN's polyfill writes the file inline). On web, FormData needs
 * a real `Blob` / `File` — we resolve the picker's `blob:` URI through fetch
 * to get one. Either way the caller hands a single object to the mutation.
 */
type FormState = {
  displayName: string;
  bio: string;
  discoverable: boolean;
};

async function toMastodonProfileImage(
  asset: ImagePicker.ImagePickerAsset,
  fallbackName: string,
): Promise<MastodonProfileImage> {
  const inferredType = asset.mimeType || 'image/jpeg';
  const name = asset.fileName || `${fallbackName}.${inferredType.split('/')[1] || 'jpg'}`;

  if (Platform.OS !== 'web') {
    return { uri: asset.uri, name, type: inferredType };
  }

  const response = await fetch(asset.uri);
  const blob = await response.blob();
  const file = new File([blob], name, { type: inferredType });
  // `MastodonProfileImage` carries the original URI for previewing — the
  // multipart serializer casts `file` to Blob via the structural shape.
  return { uri: asset.uri, name, type: inferredType, ...(file as unknown as object) };
}

/**
 * Post-signin profile setup. Forced (via a guard in the tabs layout) the
 * first time a Mastodon account hits the app — once they save or skip,
 * the per-account `mastodonOnboardingComplete` flag stops the redirect
 * from firing again.
 *
 * Discoverable defaults to off to match Mastodon's API default and stay
 * privacy-respecting; the user opts in deliberately.
 */
export default function MastodonOnboardingScreen() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const insets = useSafeAreaInsets();
  const ownAccount = useMastodonOwnAccount();
  const profileUpdate = useMastodonProfileUpdate();

  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  // Bundle the three editable fields under one reducer so the prefill
  // effect can hydrate them all with a single dispatch — the lint rule
  // flags cascading setStates inside a useEffect.
  const [form, dispatchForm] = useReducer(
    (state: FormState, partial: Partial<FormState>): FormState => ({ ...state, ...partial }),
    { displayName: '', bio: '', discoverable: false },
  );
  const setDisplayName = useCallback((value: string) => dispatchForm({ displayName: value }), []);
  const setBio = useCallback((value: string) => dispatchForm({ bio: value }), []);
  const setDiscoverable = useCallback((value: boolean) => dispatchForm({ discoverable: value }), []);
  const [pickedAvatar, setPickedAvatar] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [pickedHeader, setPickedHeader] = useState<ImagePicker.ImagePickerAsset | null>(null);
  // Ref rather than state — only the effect reads / sets it, the render
  // doesn't care, so updating doesn't need to trigger a re-render.
  const prefilledRef = useRef(false);

  const labelColor = useThemeColor({ light: '#374151', dark: '#E2E8F0' }, 'text');
  const helperColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#1F212D' }, 'border');
  const inputBackground = useThemeColor({ light: '#ffffff', dark: '#111827' }, 'background');
  const screenBackground = useThemeColor({}, 'background');
  const placeholderHeaderBg = useThemeColor({ light: '#E5E7EB', dark: '#1F212D' }, 'border');

  // Prefill once when the server profile resolves. We don't re-prefill on
  // subsequent fetches so the user's in-progress edits aren't clobbered
  // if the query refetches in the background.
  useEffect(() => {
    if (prefilledRef.current || !ownAccount.data) return;
    const a = ownAccount.data;
    dispatchForm({
      displayName: a.display_name && a.display_name !== a.username ? a.display_name : '',
      bio: a.source?.note ?? '',
      discoverable: a.discoverable === true,
    });
    prefilledRef.current = true;
  }, [ownAccount.data]);

  const pickAvatar = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      confirm({
        title: t('common.error'),
        message: t('auth.onboardingProfilePermissionDenied'),
        buttons: [{ text: t('common.ok') }],
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) setPickedAvatar(result.assets[0]);
  }, [confirm, t]);

  const pickHeader = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      confirm({
        title: t('common.error'),
        message: t('auth.onboardingProfilePermissionDenied'),
        buttons: [{ text: t('common.ok') }],
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      // 3:1 matches Mastodon's banner aspect — anything else gets cropped on display.
      aspect: [3, 1],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) setPickedHeader(result.assets[0]);
  }, [confirm, t]);

  const handleSave = useCallback(async () => {
    try {
      const avatarImage = pickedAvatar
        ? await toMastodonProfileImage(pickedAvatar, 'avatar')
        : undefined;
      const headerImage = pickedHeader
        ? await toMastodonProfileImage(pickedHeader, 'header')
        : undefined;

      await profileUpdate.mutateAsync({
        displayName: form.displayName,
        note: form.bio,
        discoverable: form.discoverable,
        avatar: avatarImage,
        header: headerImage,
      });

      // Onward to the follow-people step — the `mastodonOnboardingComplete`
      // flag is set at the END of the flow by that screen, not here.
      // Otherwise a user who saves the profile and then closes the app
      // would never see the follow step.
      setRedirectTo('/onboarding/mastodon-follow');
    } catch (err) {
      confirm({
        title: t('common.error'),
        message: err instanceof Error ? err.message : t('auth.signInFailed'),
        buttons: [{ text: t('common.ok') }],
      });
    }
  }, [form, confirm, pickedAvatar, pickedHeader, profileUpdate, t]);

  const handleSkip = useCallback(() => {
    // Skip the profile step but keep the follow step. Onboarding flag is
    // set by the follow screen, not here.
    setRedirectTo('/onboarding/mastodon-follow');
  }, []);

  const avatarPreviewUri = useMemo(() => {
    if (pickedAvatar?.uri) return pickedAvatar.uri;
    return ownAccount.data?.avatar;
  }, [ownAccount.data?.avatar, pickedAvatar?.uri]);

  const headerPreviewUri = useMemo(() => {
    if (pickedHeader?.uri) return pickedHeader.uri;
    const serverHeader = ownAccount.data?.header;
    // Don't display the placeholder header — the empty box reads as a
    // tap target prompting them to pick one.
    if (serverHeader && !serverHeader.endsWith('missing.png')) return serverHeader;
    return undefined;
  }, [ownAccount.data?.header, pickedHeader?.uri]);

  if (redirectTo) {
    return <Redirect href={redirectTo as never} />;
  }

  const submitting = profileUpdate.isPending;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: screenBackground }]}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedView style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            {t('auth.onboardingProfileTitle')}
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: helperColor }]}>
            {t('auth.onboardingProfileSubtitle')}
          </ThemedText>

          <Pressable
            onPress={pickHeader}
            accessibilityRole="button"
            accessibilityLabel={t('auth.onboardingProfilePickHeader')}
            style={({ pressed }) => [
              styles.headerPicker,
              { backgroundColor: placeholderHeaderBg, borderColor },
              pressed && styles.pressed,
            ]}
          >
            {headerPreviewUri ? (
              <Image source={{ uri: headerPreviewUri }} style={styles.headerImage} resizeMode="cover" />
            ) : (
              <ThemedText style={[styles.headerPickerLabel, { color: helperColor }]}>
                {t('auth.onboardingProfilePickHeader')}
              </ThemedText>
            )}
          </Pressable>

          <Pressable
            onPress={pickAvatar}
            accessibilityRole="button"
            accessibilityLabel={t('auth.onboardingProfilePickAvatar')}
            style={({ pressed }) => [styles.avatarPicker, pressed && styles.pressed]}
          >
            <AvatarOrInitial
              uri={avatarPreviewUri}
              seed={ownAccount.data?.display_name || ownAccount.data?.username || '?'}
              size={96}
            />
            <ThemedText style={[styles.avatarPickerLabel, { color: helperColor }]}>
              {t('auth.onboardingProfilePickAvatar')}
            </ThemedText>
          </Pressable>

          <View style={styles.field}>
            <ThemedText style={[styles.label, { color: labelColor }]}>
              {t('auth.onboardingProfileDisplayName')}
            </ThemedText>
            <TextInput
              style={[styles.input, { borderColor, backgroundColor: inputBackground, color: labelColor }]}
              value={form.displayName}
              onChangeText={setDisplayName}
              placeholder={t('auth.onboardingProfileDisplayNamePlaceholder')}
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={30}
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={[styles.label, { color: labelColor }]}>
              {t('auth.onboardingProfileBio')}
            </ThemedText>
            <TextInput
              style={[styles.input, styles.bioInput, { borderColor, backgroundColor: inputBackground, color: labelColor }]}
              value={form.bio}
              onChangeText={setBio}
              placeholder={t('auth.onboardingProfileBioPlaceholder')}
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabels}>
              <ThemedText style={[styles.label, { color: labelColor }]}>
                {t('auth.onboardingProfileDiscoverable')}
              </ThemedText>
              <ThemedText style={[styles.helper, { color: helperColor }]}>
                {t('auth.onboardingProfileDiscoverableHelp')}
              </ThemedText>
            </View>
            <Switch value={form.discoverable} onValueChange={setDiscoverable} />
          </View>

          <Pressable
            style={[styles.primaryButton, submitting && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={submitting}
            accessibilityRole="button"
          >
            <ThemedText style={styles.primaryButtonText}>
              {submitting ? t('auth.onboardingProfileSaving') : t('auth.onboardingProfileSave')}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={handleSkip}
            disabled={submitting}
            accessibilityRole="button"
            style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
          >
            <ThemedText style={[styles.skipText, { color: helperColor }]}>
              {t('auth.onboardingProfileSkip')}
            </ThemedText>
          </Pressable>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 520,
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fontSize.base,
    lineHeight: 22,
  },
  headerPicker: {
    width: '100%',
    aspectRatio: 3,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerPickerLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  avatarPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarPickerLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  field: { gap: spacing.sm },
  label: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  helper: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.lg,
  },
  bioInput: {
    minHeight: 96,
    paddingTop: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  switchLabels: { flex: 1, gap: spacing.xs },
  primaryButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: semanticColors.systemBlue,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  buttonDisabled: {
    opacity: opacity.disabled,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  skipText: {
    fontSize: fontSize.base,
  },
  pressed: {
    opacity: 0.7,
  },
});
