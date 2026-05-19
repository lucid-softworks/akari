import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { fontSize, fontWeight, layout, radius, spacing } from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useReport } from '@/hooks/mutations/useReport';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useLabelers } from '@/hooks/queries/useLabelers';
import { useLanguage } from '@/contexts/LanguageContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { formatRelativeTime } from '@/utils/timeUtils';

type LabelRecord = {
  val?: string;
  value?: string;
  text?: string;
  label?: string;
  src?: string;
  cts?: string;
  uri?: string;
  cid?: string;
  neg?: boolean;
  ver?: number;
  exp?: string;
};

type LabelDetailModalProps = {
  label: LabelRecord;
  isWarning?: boolean;
  isPositive?: boolean;
  onDismiss: () => void;
};

// Short human-readable blurbs for labels we recognise. Anything else falls
// back to "applied by <labeler>" — the value itself is the headline.
const LABEL_DESCRIPTIONS: Record<string, string> = {
  porn: 'Pornographic content.',
  sexual: 'Sexually suggestive content.',
  nudity: 'Contains non-sexual nudity.',
  'graphic-media': 'Graphic or disturbing imagery.',
  'sexual-figurative': 'Sexual figurative content (art, drawings).',
  gore: 'Graphic violence or gore.',
  spam: 'Reported as spam.',
  impersonation: 'Impersonates another person or account.',
  scam: 'Reported as a scam.',
  misleading: 'Contains misleading information.',
  hate: 'Hate speech.',
  extremist: 'Extremist content.',
  rude: 'Rude or harassing.',
  verified: 'Verified by the labeler.',
  official: 'Marked as an official account.',
  trusted: 'Marked as a trusted source.',
};

function readLabelText(label: LabelRecord): string {
  return label.val || label.value || label.text || label.label || '';
}

/**
 * Parses `at://did/...` and returns the DID, or null if the URI doesn't
 * have one. Used to decide whether a label is on the signed-in user's
 * subject (so we can offer them the appeal flow).
 */
function didFromAtUri(uri: string | undefined): string | null {
  if (!uri) return null;
  const match = /^at:\/\/(did:[^/]+)/.exec(uri);
  return match ? match[1] : null;
}

/**
 * Builds the report `subject` payload for an appeal against a label.
 * Posts pass the full uri+cid; account-level labels collapse to a DID.
 */
function subjectForLabel(label: LabelRecord): { type: 'post'; uri: string; cid: string } | { type: 'account'; did: string } | null {
  if (!label.uri) return null;
  const isPost = label.uri.includes('/app.bsky.feed.post/');
  if (isPost && label.cid) {
    return { type: 'post', uri: label.uri, cid: label.cid };
  }
  const did = didFromAtUri(label.uri);
  if (!did) return null;
  return { type: 'account', did };
}

export function LabelDetailModal({ label, isWarning, isPositive, onDismiss }: LabelDetailModalProps) {
  const { t } = useTranslation();
  const { currentLocale } = useLanguage();
  const { data: currentAccount } = useCurrentAccount();
  const { showToast } = useToast();
  const reportMutation = useReport();
  const [appealSubmitted, setAppealSubmitted] = useState(false);

  const panelColor = useThemeColor({}, 'panel');
  const borderColor = useThemeColor({}, 'border');
  const lineSoft = useThemeColor({}, 'lineSoft');
  const textPrimary = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accentColor = useThemeColor({}, 'tint');

  // Pull the labeler view (with its policies) so we can show the labeler's
  // own description for this specific label value, plus a clickable handle.
  // useLabelers fetches every labeler the user has subscribed to, so a
  // match for `label.src` covers the common case. For unsubscribed
  // labelers we fall back to the hardcoded descriptions + the raw DID.
  const { data: labelerViews } = useLabelers();
  const labelerView = useMemo(() => {
    if (!label.src || !labelerViews) return null;
    return labelerViews.find((v) => v.creator?.did === label.src) ?? null;
  }, [label.src, labelerViews]);

  const text = readLabelText(label);
  // Prefer the labeler's own published description over our hardcoded
  // fallback — labelers may define custom labels (or richer copy) that we
  // don't have a baked-in blurb for.
  const labelerDefinition = useMemo(() => {
    const defs = labelerView?.policies?.labelValueDefinitions;
    if (!defs || !text) return null;
    const match = defs.find((d) => d.identifier.toLowerCase() === text.toLowerCase());
    if (!match) return null;
    // Pick the locale that matches the active app locale, then en, then
    // the first entry. Labelers always include at least one locale entry.
    const lang = currentLocale?.split('-')[0]?.toLowerCase();
    return (
      match.locales.find((l) => l.lang.toLowerCase() === lang) ??
      match.locales.find((l) => l.lang.toLowerCase() === 'en') ??
      match.locales[0] ??
      null
    );
  }, [labelerView, text, currentLocale]);

  const description = labelerDefinition?.description
    ?? LABEL_DESCRIPTIONS[text.toLowerCase()]
    ?? null;
  const created = label.cts ? formatRelativeTime(label.cts, currentLocale ?? 'en') : null;
  const expires = label.exp ? formatRelativeTime(label.exp, currentLocale ?? 'en') : null;

  // The "appeal" affordance only shows when the labelled subject is the
  // signed-in user's account or one of their posts — appealing someone
  // else's label is meaningless.
  const subject = useMemo(() => subjectForLabel(label), [label]);
  const isOwnSubject = useMemo(() => {
    if (!subject || !currentAccount?.did) return false;
    if (subject.type === 'account') return subject.did === currentAccount.did;
    const postOwnerDid = didFromAtUri(subject.uri);
    return postOwnerDid === currentAccount.did;
  }, [subject, currentAccount?.did]);
  const canAppeal = isOwnSubject && !!label.src && !appealSubmitted;

  const handleAppeal = () => {
    if (!subject || !label.src) return;
    reportMutation.mutate(
      {
        subject,
        reasonType: 'reasonAppeal',
        labelerDid: label.src,
      },
      {
        onSuccess: () => {
          setAppealSubmitted(true);
          showToast({ message: t('labelDetail.appealSent'), type: 'success' });
        },
        onError: () => {
          showToast({ message: t('common.somethingWentWrong'), type: 'error' });
        },
      },
    );
  };

  const iconName: React.ComponentProps<typeof IconSymbol>['name'] = isWarning
    ? 'exclamationmark.triangle'
    : isPositive
    ? 'checkmark.seal'
    : 'info.circle';
  const accentTint = isWarning ? '#ff5c5c' : isPositive ? '#3fb37f' : accentColor;

  // Source row: prefer the labeler's handle when we have it, fall back to
  // the raw DID. Either way the row is tappable and routes to that
  // account's profile page so the user can read the labeler's own
  // about / labels manifesto.
  const sourceIdentifier = labelerView?.creator?.handle ?? label.src ?? null;
  const sourceLabel = labelerView?.creator?.handle
    ? `@${labelerView.creator.handle}`
    : label.src ?? '';
  const handleOpenSource = () => {
    if (!sourceIdentifier) return;
    onDismiss();
    const href =
      Platform.OS === 'web' ? `/profile/${sourceIdentifier}` : `/(tabs)/profile/${sourceIdentifier}`;
    router.push(href as never);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable
          style={[styles.card, { backgroundColor: panelColor, borderColor }]}
          onPress={() => undefined}
        >
          <View style={[styles.iconWrap, { backgroundColor: lineSoft }]}>
            <IconSymbol name={iconName} size={28} color={accentTint} />
          </View>
          <ThemedText style={[styles.headline, { color: textPrimary }]}>
            {labelerDefinition?.name ?? text}
          </ThemedText>
          {description ? (
            <ThemedText style={[styles.body, { color: textSecondary }]}>{description}</ThemedText>
          ) : (
            <ThemedText style={[styles.body, { color: textSecondary }]}>
              {t('labelDetail.unknown')}
            </ThemedText>
          )}
          <View style={styles.metaList}>
            {sourceIdentifier ? (
              <View style={styles.metaRow}>
                <ThemedText style={[styles.metaLabel, { color: textSecondary }]}>
                  {t('labelDetail.source')}
                </ThemedText>
                <Pressable
                  onPress={handleOpenSource}
                  accessibilityRole="link"
                  accessibilityLabel={sourceLabel}
                  style={({ pressed }) => [styles.metaLink, pressed && { opacity: 0.7 }]}
                >
                  <ThemedText
                    style={[styles.metaValue, { color: accentColor }]}
                    numberOfLines={1}
                  >
                    {sourceLabel}
                  </ThemedText>
                </Pressable>
              </View>
            ) : null}
            {created ? (
              <MetaRow label={t('labelDetail.created')} value={created} color={textSecondary} dim={textPrimary} />
            ) : null}
            {expires ? (
              <MetaRow label={t('labelDetail.expires')} value={expires} color={textSecondary} dim={textPrimary} />
            ) : null}
            {label.neg ? (
              <MetaRow label={t('labelDetail.negated')} value={t('labelDetail.yes')} color={textSecondary} dim={textPrimary} />
            ) : null}
          </View>
          <View style={styles.actionRow}>
            {canAppeal ? (
              <Pressable
                style={({ pressed }) => [
                  styles.action,
                  styles.actionGhost,
                  { borderColor: lineSoft },
                  (pressed || reportMutation.isPending) && { opacity: 0.7 },
                ]}
                onPress={handleAppeal}
                disabled={reportMutation.isPending}
                accessibilityRole="button"
                accessibilityLabel={t('labelDetail.appeal')}
              >
                <ThemedText style={[styles.actionText, { color: textPrimary }]}>
                  {appealSubmitted ? t('labelDetail.appealSent') : t('labelDetail.appeal')}
                </ThemedText>
              </Pressable>
            ) : null}
            <Pressable
              style={({ pressed }) => [
                styles.action,
                styles.actionPrimary,
                { backgroundColor: accentColor, borderColor: accentColor },
                pressed && { opacity: 0.85 },
              ]}
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel={t('common.done')}
            >
              <ThemedText style={[styles.actionText, { color: '#ffffff' }]}>
                {t('common.done')}
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MetaRow({
  label,
  value,
  color,
  dim,
}: {
  label: string;
  value: string;
  color: string;
  dim: string;
}) {
  return (
    <View style={styles.metaRow}>
      <ThemedText style={[styles.metaLabel, { color }]}>{label}</ThemedText>
      <ThemedText style={[styles.metaValue, { color: dim }]} numberOfLines={1} selectable>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.md,
    borderWidth: layout.hairline,
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: 'stretch',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  headline: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  body: {
    fontSize: fontSize.base,
    textAlign: 'center',
    lineHeight: 20,
  },
  metaList: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  metaLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    width: 80,
  },
  metaValue: {
    flex: 1,
    fontSize: fontSize.sm,
  },
  metaLink: {
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  action: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionGhost: {
    backgroundColor: 'transparent',
  },
  actionPrimary: {
    borderWidth: 1,
  },
  actionText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});
