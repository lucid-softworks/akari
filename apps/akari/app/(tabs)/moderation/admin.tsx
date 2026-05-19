import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Badge } from '@/app/(tabs)/moderation/index';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { fontSize, fontWeight, spacing } from '@/constants/tokens';
import { webColumnSideBorders, webScreenContainer } from '@/constants/webStyles';
import {
  useAddSafelinkRule,
  useFindRelatedAccounts,
  useOzoneSets,
  useOzoneVerifications,
  useRemoveSafelinkRule,
  useSafelinkRules,
} from '@/hooks/queries/useOzoneAdminQueries';
import { useOzoneMembership } from '@/hooks/queries/useOzoneMembership';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { formatRelativeTime } from '@/utils/timeUtils';

type AdminTab = 'safelink' | 'sets' | 'signatures' | 'verifications';
const TABS: { label: string; value: AdminTab }[] = [
  { label: 'Safelink', value: 'safelink' },
  { label: 'Sets', value: 'sets' },
  { label: 'Signatures', value: 'signatures' },
  { label: 'Verifications', value: 'verifications' },
];

/**
 * Tier-3 admin hub: safelink rules, sets, signature correlation, and
 * verification grants. Read-mostly so admins can audit without the
 * heavier UI work needed for full lifecycle management.
 */
export default function AdminScreen() {
  const { t } = useTranslation();
  const borderColor = useBorderColor();
  const secondary = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const accent = useThemeColor({}, 'tint');

  const { data: membership } = useOzoneMembership();
  const [tab, setTab] = useState<AdminTab>('safelink');

  if (!membership?.isMod) {
    return (
      <ThemedView style={Platform.OS === 'web' ? webScreenContainer : styles.container}>
        <Stack.Screen options={{ title: t('moderation.admin.title') }} />
        <ThemedText style={[styles.placeholder, { color: secondary }]}>
          {t('moderation.admin.notModeratorPlaceholder')}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={Platform.OS === 'web' ? webScreenContainer : styles.container}>
      <Stack.Screen options={{ title: t('moderation.admin.title') }} />

      <View
        style={[
          styles.tabBar,
          { borderBottomColor: borderColor },
          webColumnSideBorders(borderColor),
        ]}
      >
        {TABS.map((t) => (
          <Pressable
            key={t.value}
            onPress={() => setTab(t.value)}
            style={({ pressed }) => [styles.tabButton, pressed && { opacity: 0.6 }]}
          >
            <ThemedText
              style={[
                styles.tabLabel,
                tab === t.value
                  ? { color: accent, fontWeight: fontWeight.semibold }
                  : { color: secondary },
              ]}
            >
              {t.label}
            </ThemedText>
            <View
              style={[
                styles.tabIndicator,
                tab === t.value ? { backgroundColor: accent } : null,
              ]}
            />
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {tab === 'safelink' ? (
          <SafelinkTab borderColor={borderColor} secondary={secondary} />
        ) : tab === 'sets' ? (
          <SetsTab borderColor={borderColor} secondary={secondary} />
        ) : tab === 'signatures' ? (
          <SignaturesTab borderColor={borderColor} secondary={secondary} />
        ) : (
          <VerificationsTab borderColor={borderColor} secondary={secondary} />
        )}
      </ScrollView>
    </ThemedView>
  );
}

function SafelinkTab({ borderColor, secondary }: { borderColor: string; secondary: string }) {
  const { t } = useTranslation();
  const inputBg = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const accent = useThemeColor({}, 'tint');
  const dangerColor = useThemeColor({ light: '#dc2626', dark: '#ef4444' }, 'tint');

  const { data: rules } = useSafelinkRules();
  const add = useAddSafelinkRule();
  const remove = useRemoveSafelinkRule();

  const [url, setUrl] = useState('');
  const [reason, setReason] = useState('');
  const [pattern, setPattern] = useState<'domain' | 'url'>('domain');
  const [action, setAction] = useState<'block' | 'warn' | 'whitelist'>('block');

  return (
    <View>
      <View
        style={[styles.addBar, { borderBottomColor: borderColor, backgroundColor: inputBg }, webColumnSideBorders(borderColor)]}
      >
        <TextInput
          value={url}
          onChangeText={setUrl}
          placeholder="hostname.example or full URL"
          placeholderTextColor={secondary}
          style={[styles.input, { color: textColor, borderColor }]}
        />
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Reason"
          placeholderTextColor={secondary}
          style={[styles.input, { color: textColor, borderColor }]}
        />
        <View style={styles.chipRow}>
          {(['domain', 'url'] as const).map((p) => (
            <Pressable
              key={p}
              onPress={() => setPattern(p)}
              style={[
                styles.chip,
                { borderColor: pattern === p ? accent : borderColor, backgroundColor: pattern === p ? `${accent}22` : 'transparent' },
              ]}
            >
              <ThemedText style={[styles.chipLabel, pattern === p && { color: accent, fontWeight: fontWeight.semibold }]}>{p}</ThemedText>
            </Pressable>
          ))}
        </View>
        <View style={styles.chipRow}>
          {(['block', 'warn', 'whitelist'] as const).map((a) => (
            <Pressable
              key={a}
              onPress={() => setAction(a)}
              style={[
                styles.chip,
                { borderColor: action === a ? accent : borderColor, backgroundColor: action === a ? `${accent}22` : 'transparent' },
              ]}
            >
              <ThemedText style={[styles.chipLabel, action === a && { color: accent, fontWeight: fontWeight.semibold }]}>{a}</ThemedText>
            </Pressable>
          ))}
        </View>
        <Pressable
          disabled={!url.trim() || !reason.trim() || add.isPending}
          onPress={() => add.mutate({ url: url.trim(), pattern, action, reason: reason.trim() })}
          style={[
            styles.primaryButton,
            { borderColor: accent, backgroundColor: `${accent}22` },
            (!url.trim() || !reason.trim() || add.isPending) && { opacity: 0.5 },
          ]}
        >
          <ThemedText style={[styles.primaryButtonLabel, { color: accent }]}>
            {add.isPending ? t('moderation.admin.adding') : t('moderation.admin.addRule')}
          </ThemedText>
        </Pressable>
      </View>

      {!rules || rules.length === 0 ? (
        <ThemedText style={[styles.placeholder, { color: secondary }]}>{t('moderation.admin.noSafelinkRules')}</ThemedText>
      ) : (
        rules.map((rule) => {
          const r = rule as { url?: string; pattern?: string; action?: string; reason?: string; createdAt?: string };
          return (
            <View
              key={`${r.url ?? ''}|${r.pattern ?? ''}|${r.action ?? ''}|${r.createdAt ?? ''}`}
              style={[styles.row, { borderBottomColor: borderColor }, webColumnSideBorders(borderColor)]}
            >
              <View style={styles.rowBody}>
                <ThemedText style={styles.rowTitle} numberOfLines={1}>{r.url}</ThemedText>
                <View style={styles.rowBadges}>
                  <Badge label={r.pattern ?? 'domain'} />
                  <Badge label={r.action ?? 'block'} tone={r.action === 'whitelist' ? 'accent' : r.action === 'warn' ? 'warn' : 'danger'} />
                  {r.createdAt ? (
                    <ThemedText style={[styles.rowMeta, { color: secondary }]}>
                      {formatRelativeTime(r.createdAt)}
                    </ThemedText>
                  ) : null}
                </View>
                {r.reason ? (
                  <ThemedText style={[styles.rowBody, { color: secondary }]} numberOfLines={2}>
                    {r.reason}
                  </ThemedText>
                ) : null}
              </View>
              <Pressable
                onPress={() =>
                  r.url && r.pattern
                    ? remove.mutate({ url: r.url, pattern: r.pattern as 'domain' | 'url' })
                    : undefined
                }
                style={[styles.smallButton, { borderColor: dangerColor }]}
              >
                <ThemedText style={[styles.smallButtonLabel, { color: dangerColor }]}>{t('moderation.admin.remove')}</ThemedText>
              </Pressable>
            </View>
          );
        })
      )}
    </View>
  );
}

function SetsTab({ borderColor, secondary }: { borderColor: string; secondary: string }) {
  const { t } = useTranslation();
  const { data: sets } = useOzoneSets();
  if (!sets || sets.length === 0) {
    return <ThemedText style={[styles.placeholder, { color: secondary }]}>{t('moderation.admin.noSets')}</ThemedText>;
  }
  return (
    <View>
      {sets.map((s) => {
        const set = s as { name?: string; description?: string; size?: number };
        return (
          <View
            key={set.name ?? ''}
            style={[styles.row, { borderBottomColor: borderColor }, webColumnSideBorders(borderColor)]}
          >
            <View style={styles.rowBody}>
              <ThemedText style={styles.rowTitle}>{set.name}</ThemedText>
              {set.description ? (
                <ThemedText style={[styles.rowBody, { color: secondary }]} numberOfLines={2}>
                  {set.description}
                </ThemedText>
              ) : null}
              {typeof set.size === 'number' ? (
                <Badge label={`${set.size} members`} tone="accent" />
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function SignaturesTab({ borderColor, secondary }: { borderColor: string; secondary: string }) {
  const { t } = useTranslation();
  const accent = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const inputBg = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const [did, setDid] = useState('');
  const [active, setActive] = useState<string | undefined>(undefined);
  const { data: related } = useFindRelatedAccounts(active);

  return (
    <View>
      <View
        style={[styles.addBar, { borderBottomColor: borderColor, backgroundColor: inputBg }, webColumnSideBorders(borderColor)]}
      >
        <TextInput
          value={did}
          onChangeText={setDid}
          placeholder="did:plc:…"
          placeholderTextColor={secondary}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { color: textColor, borderColor }]}
        />
        <Pressable
          disabled={!did.trim()}
          onPress={() => setActive(did.trim())}
          style={[
            styles.primaryButton,
            { borderColor: accent, backgroundColor: `${accent}22` },
            !did.trim() && { opacity: 0.5 },
          ]}
        >
          <ThemedText style={[styles.primaryButtonLabel, { color: accent }]}>{t('moderation.admin.findRelated')}</ThemedText>
        </Pressable>
      </View>
      {!active ? (
        <ThemedText style={[styles.placeholder, { color: secondary }]}>
          {t('moderation.admin.signaturesIntro')}
        </ThemedText>
      ) : !related || related.length === 0 ? (
        <ThemedText style={[styles.placeholder, { color: secondary }]}>{t('moderation.admin.noRelated')}</ThemedText>
      ) : (
        related.map((row) => {
          const r = row as { account?: { did?: string; handle?: string }; similarities?: string[] };
          return (
            <View
              key={r.account?.did ?? r.account?.handle ?? ''}
              style={[styles.row, { borderBottomColor: borderColor }, webColumnSideBorders(borderColor)]}
            >
              <View style={styles.rowBody}>
                <ThemedText style={styles.rowTitle}>{r.account?.handle ?? r.account?.did}</ThemedText>
                <View style={styles.rowBadges}>
                  {r.similarities?.map((s) => <Badge key={s} label={s} tone="warn" />)}
                </View>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

function VerificationsTab({ borderColor, secondary }: { borderColor: string; secondary: string }) {
  const { t } = useTranslation();
  const { data: verifications } = useOzoneVerifications();
  if (!verifications || verifications.length === 0) {
    return <ThemedText style={[styles.placeholder, { color: secondary }]}>{t('moderation.admin.noVerifications')}</ThemedText>;
  }
  return (
    <View>
      {verifications.map((v) => {
        const it = v as { subject?: string; handle?: string; displayName?: string; createdAt?: string };
        return (
          <View
            key={`${it.subject ?? ''}|${it.createdAt ?? ''}`}
            style={[styles.row, { borderBottomColor: borderColor }, webColumnSideBorders(borderColor)]}
          >
            <View style={styles.rowBody}>
              <ThemedText style={styles.rowTitle}>{it.displayName ?? it.handle ?? it.subject}</ThemedText>
              {it.handle ? (
                <ThemedText style={[styles.rowBody, { color: secondary }]}>@{it.handle}</ThemedText>
              ) : null}
              <View style={styles.rowBadges}>
                <Badge label="verified" tone="accent" />
                {it.createdAt ? (
                  <ThemedText style={[styles.rowMeta, { color: secondary }]}>
                    {formatRelativeTime(it.createdAt)}
                  </ThemedText>
                ) : null}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: fontSize.sm,
  },
  tabIndicator: {
    height: 2,
    width: '100%',
    marginTop: spacing.xs,
    borderRadius: 1,
  },
  list: { paddingBottom: spacing.xxl },
  addBar: {
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: fontSize.xs,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
    borderWidth: 1,
  },
  primaryButtonLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  rowTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  rowBody2: {
    fontSize: fontSize.sm,
  },
  rowBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  rowMeta: {
    fontSize: fontSize.xs,
  },
  smallButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  smallButtonLabel: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  placeholder: {
    padding: spacing.lg,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
});
