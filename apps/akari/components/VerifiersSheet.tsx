import { Image } from '@/components/Image';
import React, { useMemo } from 'react';
import { Modal, Platform, Pressable, StatusBar, StyleSheet, View } from 'react-native';

import type { BlueskyVerification } from '@/bluesky-api';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { VirtualizedList } from '@/components/ui/VirtualizedList';
import type { VerificationTier } from '@/components/VerificationBadge';
import { activeOpacity, fontSize, fontWeight, radius, spacing } from '@/constants/tokens';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useVerifiersForDid } from '@/hooks/queries/useVerifiersForDid';
import { useProfile } from '@/hooks/queries/useProfile';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { useVerificationSettings } from '@/hooks/useVerificationSettings';
import { useNavigateToProfile } from '@/utils/navigation';
import { formatRelativeTime } from '@/utils/timeUtils';

const VERIFIED_BLUE = '#0085ff';
const VERIFIED_SILVER = '#C0C0C0';
const VERIFIED_GOLD = '#FFC629';
const AVATAR_SIZE = 40;

type VerifiersSheetProps = {
  visible: boolean;
  onClose: () => void;
  subjectDid?: string;
  verification?: BlueskyVerification;
  subjectHandle?: string;
  subjectDisplayName?: string;
  tier?: VerificationTier;
};

type VerifierRowData = {
  /** DID of the issuer; primary identifier and React key. */
  issuer: string;
  /** AT-URI of the verification record, when known (appview only). */
  uri?: string;
  /** When the verification record was created, when known (appview only). */
  createdAt?: string;
};

type SheetSection =
  | { type: 'header'; key: string; label: string }
  | { type: 'row'; key: string; row: VerifierRowData };

export function VerifiersSheet({
  visible,
  onClose,
  subjectDid,
  verification,
  subjectHandle,
  subjectDisplayName,
  tier,
}: VerifiersSheetProps) {
  const { t } = useTranslation();
  const borderColor = useBorderColor();
  const backgroundColor = useThemeColor({ light: '#ffffff', dark: '#151718' }, 'background');
  const textColor = useThemeColor({ light: '#000000', dark: '#ffffff' }, 'text');
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const { trustedVerifierDids, isTrustedVerifier } = useVerificationSettings();
  const { data: constellationDids } = useVerifiersForDid(visible ? subjectDid : undefined);
  // iOS pageSheet auto-respects the safe area; Android fullScreen draws under
  // the status bar, so we have to push the header down ourselves or the Done
  // button lands behind the notch / clock. `useSafeAreaInsets` returns 0
  // inside a Modal (the Modal is its own native window, the SafeAreaProvider
  // context doesn't reach), so we use `StatusBar.currentHeight` instead —
  // a static Android-only value exposed without any provider.
  const containerTopPadding = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;

  const { trustedRows, otherRows } = useMemo(() => {
    const byIssuer = new Map<string, VerifierRowData>();

    for (const v of verification?.verifications ?? []) {
      if (!v.isValid) continue;
      byIssuer.set(v.issuer, { issuer: v.issuer, uri: v.uri, createdAt: v.createdAt });
    }
    for (const did of constellationDids ?? []) {
      if (!byIssuer.has(did)) byIssuer.set(did, { issuer: did });
    }

    const rows = Array.from(byIssuer.values());
    return {
      trustedRows: rows.filter((r) => isTrustedVerifier(r.issuer)),
      otherRows: rows.filter((r) => !isTrustedVerifier(r.issuer)),
    };
  }, [verification, constellationDids, isTrustedVerifier]);

  const sections = useMemo<SheetSection[]>(() => {
    const out: SheetSection[] = [];
    if (trustedRows.length > 0) {
      out.push({ type: 'header', key: 'trusted-header', label: t('ui.verifiersTrustedHeader') });
      for (const row of trustedRows) {
        out.push({ type: 'row', key: `trusted:${row.issuer}`, row });
      }
    }
    if (otherRows.length > 0) {
      out.push({ type: 'header', key: 'other-header', label: t('ui.verifiersOtherHeader') });
      for (const row of otherRows) {
        out.push({ type: 'row', key: `other:${row.issuer}`, row });
      }
    }
    return out;
  }, [trustedRows, otherRows, t]);

  const introTitle = useMemo(() => {
    const subjectName = subjectDisplayName || subjectHandle || '';
    if (tier === 'gold') return t('ui.verifiersSheetIntroTitleGold', { name: subjectName });
    if (tier === 'silver') return t('ui.verifiersSheetIntroTitleSilver', { name: subjectName });
    return t('ui.verifiersSheetIntroTitle', { name: subjectName });
  }, [tier, subjectDisplayName, subjectHandle, t]);

  const introBody = useMemo(() => {
    if (trustedVerifierDids.length === 0) return t('ui.verifiersSheetIntroBodyNoTrusted');
    return t('ui.verifiersSheetIntroBody');
  }, [trustedVerifierDids.length, t]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <ThemedView style={[styles.container, { backgroundColor, paddingTop: containerTopPadding }]}>
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <Pressable onPress={onClose} style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.7 }]} accessibilityRole="button">
            <ThemedText style={[styles.headerButtonText, { color: VERIFIED_BLUE }]}>
              {t('common.done')}
            </ThemedText>
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: textColor }]}>
            {t('ui.verifiersSheetTitle')}
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.intro}>
          <IconSymbol
            name="checkmark.seal.fill"
            size={32}
            color={tier === 'gold' ? VERIFIED_GOLD : tier === 'silver' ? VERIFIED_SILVER : VERIFIED_BLUE}
          />
          <ThemedText style={[styles.introTitle, { color: textColor }]}>{introTitle}</ThemedText>
          <ThemedText style={[styles.introBody, { color: subduedColor }]}>{introBody}</ThemedText>
        </View>

        {sections.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText style={[styles.emptyText, { color: subduedColor }]}>
              {t('ui.noVerifiers')}
            </ThemedText>
          </View>
        ) : (
          <VirtualizedList
            data={sections}
            renderItem={({ item }) =>
              item.type === 'header' ? (
                <SectionHeader label={item.label} subduedColor={subduedColor} />
              ) : (
                <VerifierRow
                  row={item.row}
                  onClose={onClose}
                  borderColor={borderColor}
                  subduedColor={subduedColor}
                />
              )
            }
            keyExtractor={(item) => item.key}
            estimatedItemSize={64}
            contentContainerStyle={styles.listContent}
          />
        )}
      </ThemedView>
    </Modal>
  );
}

function SectionHeader({ label, subduedColor }: { label: string; subduedColor: string }) {
  return (
    <View style={styles.sectionHeader}>
      <ThemedText style={[styles.sectionHeaderText, { color: subduedColor }]}>
        {label.toUpperCase()}
      </ThemedText>
    </View>
  );
}

type VerifierRowProps = {
  row: VerifierRowData;
  onClose: () => void;
  borderColor: string;
  subduedColor: string;
};

function VerifierRow({ row, onClose, borderColor, subduedColor }: VerifierRowProps) {
  const { t } = useTranslation();
  const { data: profile, isLoading } = useProfile(row.issuer);
  const navigateToProfile = useNavigateToProfile();
  const { isTrustedVerifier, addTrustedVerifier, removeTrustedVerifier } = useVerificationSettings();

  const isTrusted = isTrustedVerifier(row.issuer);

  const handlePress = () => {
    onClose();
    navigateToProfile({ actor: profile?.handle ?? row.issuer });
  };

  const handleToggleTrusted = () => {
    if (isTrusted) removeTrustedVerifier(row.issuer);
    else addTrustedVerifier(row.issuer);
  };

  const displayName = profile?.displayName?.trim() || profile?.handle || row.issuer;
  const handle = profile?.handle;

  return (
    <View style={[styles.row, { borderBottomColor: borderColor }]}>
      <Pressable
        onPress={handlePress}
        
        style={({ pressed }) => [styles.rowMain, pressed && { opacity: activeOpacity.default }]}
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
          {row.createdAt ? (
            <ThemedText style={[styles.rowMeta, { color: subduedColor }]} numberOfLines={1}>
              {t('ui.verifiedOn', { date: formatRelativeTime(row.createdAt) })}
            </ThemedText>
          ) : null}
        </View>
      </Pressable>
      <Pressable
        onPress={handleToggleTrusted}
        accessibilityRole="button"
        accessibilityLabel={
          isTrusted ? t('ui.untrustVerifier') : t('ui.trustVerifier')
        }
        style={({ pressed }) => [styles.trustToggle, pressed && { opacity: 0.7 }]}
      >
        <IconSymbol
          name={isTrusted ? 'checkmark.seal.fill' : 'checkmark.seal'}
          size={20}
          color={isTrusted ? VERIFIED_GOLD : subduedColor}
        />
      </Pressable>
    </View>
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
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  sectionHeaderText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 0.5,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  trustToggle: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
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
