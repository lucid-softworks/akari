import { Image } from 'expo-image';
import React from 'react';
import { Modal, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';

import type { BlueskyVerification, BlueskyVerificationView } from '@/bluesky-api';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { VirtualizedList } from '@/components/ui/VirtualizedList';
import { activeOpacity, fontSize, fontWeight, radius, spacing } from '@/constants/tokens';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useProfile } from '@/hooks/queries/useProfile';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { useNavigateToProfile } from '@/utils/navigation';
import { formatRelativeTime } from '@/utils/timeUtils';

const VERIFIED_BLUE = '#0085ff';
const AVATAR_SIZE = 40;

type VerifiersSheetProps = {
  visible: boolean;
  onClose: () => void;
  verification: BlueskyVerification;
  subjectHandle?: string;
  subjectDisplayName?: string;
};

export function VerifiersSheet({
  visible,
  onClose,
  verification,
  subjectHandle,
  subjectDisplayName,
}: VerifiersSheetProps) {
  const { t } = useTranslation();
  const borderColor = useBorderColor();
  const backgroundColor = useThemeColor({ light: '#ffffff', dark: '#151718' }, 'background');
  const textColor = useThemeColor({ light: '#000000', dark: '#ffffff' }, 'text');
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');

  const validVerifiers = verification.verifications.filter((v) => v.isValid);
  const isTrustedVerifier = verification.trustedVerifierStatus === 'valid';

  const subjectName = subjectDisplayName || subjectHandle || '';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton} accessibilityRole="button">
            <ThemedText style={[styles.headerButtonText, { color: VERIFIED_BLUE }]}>
              {t('common.done')}
            </ThemedText>
          </TouchableOpacity>
          <ThemedText style={[styles.headerTitle, { color: textColor }]}>
            {t('ui.verifiersSheetTitle')}
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.intro}>
          <IconSymbol name="checkmark.seal.fill" size={32} color={VERIFIED_BLUE} />
          <ThemedText style={[styles.introTitle, { color: textColor }]}>
            {isTrustedVerifier
              ? t('ui.trustedVerifierSheetIntroTitle', { name: subjectName })
              : t('ui.verifiersSheetIntroTitle', { name: subjectName })}
          </ThemedText>
          <ThemedText style={[styles.introBody, { color: subduedColor }]}>
            {isTrustedVerifier
              ? t('ui.trustedVerifierSheetIntroBody')
              : t('ui.verifiersSheetIntroBody')}
          </ThemedText>
        </View>

        {validVerifiers.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText style={[styles.emptyText, { color: subduedColor }]}>
              {t('ui.noVerifiers')}
            </ThemedText>
          </View>
        ) : (
          <VirtualizedList
            data={validVerifiers}
            renderItem={({ item }) => (
              <VerifierRow item={item} onClose={onClose} borderColor={borderColor} subduedColor={subduedColor} />
            )}
            keyExtractor={(item) => item.uri}
            estimatedItemSize={64}
            contentContainerStyle={styles.listContent}
          />
        )}
      </ThemedView>
    </Modal>
  );
}

type VerifierRowProps = {
  item: BlueskyVerificationView;
  onClose: () => void;
  borderColor: string;
  subduedColor: string;
};

function VerifierRow({ item, onClose, borderColor, subduedColor }: VerifierRowProps) {
  const { t } = useTranslation();
  const { data: profile, isLoading } = useProfile(item.issuer);
  const navigateToProfile = useNavigateToProfile();

  const handlePress = () => {
    onClose();
    navigateToProfile({ actor: profile?.handle ?? item.issuer });
  };

  const displayName = profile?.displayName?.trim() || profile?.handle || item.issuer;
  const handle = profile?.handle;

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={activeOpacity.default}
      style={[styles.row, { borderBottomColor: borderColor }]}
      accessibilityRole="button"
    >
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
        <ThemedText style={[styles.rowMeta, { color: subduedColor }]} numberOfLines={1}>
          {t('ui.verifiedOn', { date: formatRelativeTime(item.createdAt) })}
        </ThemedText>
      </View>
      <IconSymbol name="checkmark.seal.fill" size={16} color={VERIFIED_BLUE} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 0.5,
  },
  headerButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  headerButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.regular,
  },
  headerTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  headerSpacer: {
    width: 60,
  },
  intro: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  introTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  introBody: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 0.5,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.full,
  },
  avatarPlaceholder: {
    borderWidth: 1,
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  rowHandle: {
    fontSize: fontSize.sm,
  },
  rowMeta: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.md,
  },
});
