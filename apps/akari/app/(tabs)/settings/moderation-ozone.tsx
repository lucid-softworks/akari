import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Input } from '@/components/ui/Input';

import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { SettingsScroll } from '@/components/settings/SettingsScroll';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useOzoneSettings } from '@/hooks/useOzoneSettings';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { DEFAULT_OZONE_DID } from '@/utils/blueskyOzone';
import { Pressable } from 'react-native';

/**
 * Configure which Ozone labeler the moderation UI talks to. The DID is
 * routed via the user's PDS using an `atproto-proxy: <did>#atproto_labeler`
 * header per request, so any Ozone instance reachable from the PDS works
 * without further config.
 */
export default function OzoneSettingsScreen() {
  const borderColor = useBorderColor();
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const dangerColor = useThemeColor({ light: '#dc2626', dark: '#ef4444' }, 'tint');
  const { t } = useTranslation();
  const { ozoneDid, setOzoneDid, resetOzoneDid } = useOzoneSettings();

  const [draft, setDraft] = useState(ozoneDid);
  const handleSave = useCallback(() => {
    setOzoneDid(draft);
  }, [draft, setOzoneDid]);

  const isDefault = ozoneDid === DEFAULT_OZONE_DID;
  const dirty = draft.trim() !== ozoneDid;

  return (
    <SettingsSubpageLayout title={t('settings.ozoneLabeler.title')}>
      <SettingsScroll
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <ThemedView style={[styles.card, { borderColor }]}>
          <ThemedText style={styles.label}>{t('settings.ozoneLabeler.didLabel')}</ThemedText>
          <ThemedText style={[styles.hint, { color: subduedColor }]}>
            {t('settings.ozoneLabeler.didHint')}
          </ThemedText>
          <Input
            containerStyle={styles.inputBox}
            value={draft}
            onChangeText={setDraft}
            placeholder={DEFAULT_OZONE_DID}
            placeholderTextColor={subduedColor}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
          />
          <View style={styles.buttonRow}>
            <Pressable
              accessibilityRole="button"
              disabled={!dirty}
              onPress={handleSave}
              style={[
                styles.button,
                { borderColor },
                !dirty ? { opacity: 0.4 } : null,
              ]}
            >
              <ThemedText style={styles.buttonText}>
                {t('settings.ozoneLabeler.save')}
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isDefault}
              onPress={() => {
                resetOzoneDid();
                setDraft(DEFAULT_OZONE_DID);
              }}
              style={[
                styles.button,
                { borderColor: dangerColor },
                isDefault ? { opacity: 0.4 } : null,
              ]}
            >
              <ThemedText style={[styles.buttonText, { color: dangerColor }]}>
                {t('settings.ozoneLabeler.reset')}
              </ThemedText>
            </Pressable>
          </View>
        </ThemedView>

        <ThemedView style={[styles.card, { borderColor }]}>
          <ThemedText style={styles.label}>{t('settings.ozoneLabeler.currentLabel')}</ThemedText>
          <ThemedText style={[styles.value, { color: subduedColor }]} selectable>
            {ozoneDid}
          </ThemedText>
          <ThemedText style={[styles.hint, { color: subduedColor }]}>
            {isDefault
              ? t('settings.ozoneLabeler.usingDefault')
              : t('settings.ozoneLabeler.usingCustom')}
          </ThemedText>
        </ThemedView>
      </SettingsScroll>
    </SettingsSubpageLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  contentContainer: { paddingBottom: 32 },
  card: {
    marginHorizontal: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
  value: {
    fontSize: 13,
    fontFamily: 'Menlo, Consolas, monospace',
  },
  inputBox: {
    marginTop: 8,
    borderRadius: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
