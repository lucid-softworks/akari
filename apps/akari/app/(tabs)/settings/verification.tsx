import { Image } from '@/components/Image';
import React from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { SettingsSection } from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { SettingsScroll } from '@/components/settings/SettingsScroll';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { hitSlop } from '@/constants/tokens';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useProfile } from '@/hooks/queries/useProfile';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { useVerificationSettings } from '@/hooks/useVerificationSettings';

const AVATAR_SIZE = 36;

export default function VerificationSettingsScreen() {
  const borderColor = useBorderColor();
  const iconColor = useThemeColor({}, 'text');
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const { t } = useTranslation();
  const { badgesEnabled, setBadgesEnabled, trustedVerifierDids, removeTrustedVerifier } =
    useVerificationSettings();

  return (
    <SettingsSubpageLayout title={t('settings.verificationSettings')}>
      <SettingsScroll
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <SettingsSection isFirst>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <ThemedView style={[styles.toggleRow, { borderBottomColor: borderColor }]}>
              <IconSymbol
                color={iconColor}
                name="checkmark.seal.fill"
                size={20}
                style={styles.toggleIcon}
              />
              <View style={styles.toggleLabelWrap}>
                <ThemedText style={styles.toggleLabel}>
                  {t('settings.verificationBadgesEnabled')}
                </ThemedText>
                <ThemedText style={[styles.toggleHint, { color: subduedColor }]}>
                  {t('settings.verificationBadgesHint')}
                </ThemedText>
              </View>
              <Switch value={badgesEnabled} onValueChange={setBadgesEnabled} />
            </ThemedView>
          </ThemedView>
        </SettingsSection>

        <SettingsSection>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <View style={styles.sectionHeader}>
              <ThemedText style={[styles.sectionHeaderText, { color: subduedColor }]}>
                {t('settings.trustedVerifiersHeader')}
              </ThemedText>
            </View>
            {trustedVerifierDids.length === 0 ? (
              <ThemedView style={styles.emptyState}>
                <ThemedText style={[styles.emptyText, { color: subduedColor }]}>
                  {t('settings.trustedVerifiersEmpty')}
                </ThemedText>
              </ThemedView>
            ) : (
              trustedVerifierDids.map((did, index) => (
                <TrustedVerifierRow
                  key={did}
                  did={did}
                  onRemove={() => removeTrustedVerifier(did)}
                  borderColor={borderColor}
                  subduedColor={subduedColor}
                  showDivider={index < trustedVerifierDids.length - 1}
                />
              ))
            )}
          </ThemedView>
        </SettingsSection>
      </SettingsScroll>
    </SettingsSubpageLayout>
  );
}

type TrustedVerifierRowProps = {
  did: string;
  onRemove: () => void;
  borderColor: string;
  subduedColor: string;
  showDivider: boolean;
};

function TrustedVerifierRow({
  did,
  onRemove,
  borderColor,
  subduedColor,
  showDivider,
}: TrustedVerifierRowProps) {
  const { t } = useTranslation();
  const { data: profile, isLoading } = useProfile(did);

  const displayName = profile?.displayName?.trim() || profile?.handle || did;
  const handle = profile?.handle;

  return (
    <View style={[styles.row, showDivider && { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      {profile?.avatar ? (
        <Image source={{ uri: profile.avatar }} style={styles.avatar} contentFit="cover" />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder, { borderColor }]} />
      )}
      <View style={styles.rowText}>
        <ThemedText style={styles.rowName} numberOfLines={1}>
          {isLoading && !profile ? t('common.loading') : displayName}
        </ThemedText>
        {handle ? (
          <ThemedText style={[styles.rowHandle, { color: subduedColor }]} numberOfLines={1}>
            @{handle}
          </ThemedText>
        ) : null}
      </View>
      <Pressable
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={t('ui.untrustVerifier')}
        hitSlop={hitSlop}
        style={({ pressed }) => [styles.removeButton, pressed && { opacity: 0.7 }]}
      >
        <IconSymbol name="minus.circle.fill" size={22} color={subduedColor} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  sectionCard: {
    marginHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0,
  },
  toggleIcon: {
    marginRight: 12,
  },
  toggleLabelWrap: {
    flex: 1,
    paddingRight: 12,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  toggleHint: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    borderWidth: 1,
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '500',
  },
  rowHandle: {
    fontSize: 13,
  },
  removeButton: {
    padding: 4,
  },
  emptyState: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
