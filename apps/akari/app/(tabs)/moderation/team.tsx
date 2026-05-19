import { Stack } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Avatar, Badge, shortDid } from '@/app/(tabs)/moderation/index';
import { CenteredModal } from '@/components/ui/CenteredModal';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { fontSize, fontWeight, spacing } from '@/constants/tokens';
import { webColumnSideBorders, webScreenContainer } from '@/constants/webStyles';
import { useDialogManager } from '@/contexts/DialogContext';
import { useOzoneMembership } from '@/hooks/queries/useOzoneMembership';
import {
  useAddOzoneTeamMember,
  useDeleteOzoneTeamMember,
  useOzoneTeam,
  useUpdateOzoneTeamMember,
} from '@/hooks/queries/useOzoneTeam';
import { useTypeaheadActors, type TypeaheadActor } from '@/hooks/queries/useTypeaheadActors';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

const ROLE_OPTIONS = [
  { label: 'Admin', value: 'tools.ozone.team.defs#roleAdmin' },
  { label: 'Moderator', value: 'tools.ozone.team.defs#roleModerator' },
  { label: 'Triage', value: 'tools.ozone.team.defs#roleTriage' },
  { label: 'Verifier', value: 'tools.ozone.team.defs#roleVerifier' },
];

const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.map((r) => [r.value, r.label]),
);

/**
 * Team admin: list members, add new ones, update roles, disable/enable,
 * and remove. Gated on the admin role since `addMember` / `deleteMember`
 * require it.
 */
export default function TeamScreen() {
  const { t } = useTranslation();
  const borderColor = useBorderColor();
  const secondary = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const accent = useThemeColor({}, 'tint');
  const dangerColor = useThemeColor({ light: '#dc2626', dark: '#ef4444' }, 'tint');

  const { data: membership } = useOzoneMembership();
  const { data: members } = useOzoneTeam();
  const add = useAddOzoneTeamMember();
  const update = useUpdateOzoneTeamMember();
  const del = useDeleteOzoneTeamMember();

  const dialogManager = useDialogManager();
  const existingDids = React.useMemo(
    () => new Set((members ?? []).map((m) => m.did)),
    [members],
  );
  const openAdd = useCallback(() => {
    const id = 'team-add-member';
    const close = () => dialogManager.close(id);
    dialogManager.open({
      id,
      component: (
        <AddTeamMemberModal
          onClose={close}
          onSubmit={async ({ did, role }) => {
            await add.mutateAsync({ did, role });
            close();
          }}
          isPending={add.isPending}
          existingDids={existingDids}
        />
      ),
    });
  }, [add, dialogManager, existingDids]);

  const isAdmin = membership?.role === 'tools.ozone.team.defs#roleAdmin';

  if (!membership?.isMod) {
    return (
      <ThemedView style={Platform.OS === 'web' ? webScreenContainer : styles.container}>
        <Stack.Screen options={{ title: t('moderation.team.title') }} />
        <ThemedText style={[styles.placeholder, { color: secondary }]}>
          {t('moderation.team.notModeratorPlaceholder')}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={Platform.OS === 'web' ? webScreenContainer : styles.container}>
      <Stack.Screen options={{ title: t('moderation.team.title') }} />

      <View
        style={[
          styles.header,
          { borderBottomColor: borderColor },
          webColumnSideBorders(borderColor),
        ]}
      >
        <ThemedText style={styles.title}>{t('moderation.team.heading')}</ThemedText>
        {isAdmin ? (
          <Pressable
            onPress={openAdd}
            style={({ pressed }) => [
              styles.primaryButton,
              { borderColor: accent },
              pressed && { opacity: 0.6 },
            ]}
          >
            <ThemedText style={[styles.primaryButtonLabel, { color: accent }]}>
              {t('moderation.team.addMember')}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {!members || members.length === 0 ? (
          <ThemedText style={[styles.placeholder, { color: secondary }]}>{t('moderation.team.noMembers')}</ThemedText>
        ) : (
          members.map((m) => {
            const profile = m.profile as
              | { avatar?: string; handle?: string; displayName?: string }
              | undefined;
            const handle = profile?.handle;
            const display = profile?.displayName;
            return (
            <View
              key={m.did}
              style={[styles.row, { borderBottomColor: borderColor }, webColumnSideBorders(borderColor)]}
            >
              <Avatar uri={profile?.avatar} handle={handle ?? m.did} size={40} />
              <View style={styles.rowBody}>
                <ThemedText style={styles.rowTitle} numberOfLines={1}>
                  {display ?? handle ?? shortDid(m.did)}
                </ThemedText>
                {handle ? (
                  <ThemedText style={[styles.rowHandle, { color: secondary }]} numberOfLines={1}>
                    @{handle}
                  </ThemedText>
                ) : (
                  <ThemedText style={[styles.rowHandle, { color: secondary }]} numberOfLines={1} selectable>
                    {shortDid(m.did)}
                  </ThemedText>
                )}
                <View style={styles.rowBadges}>
                  <Badge label={ROLE_LABELS[m.role] ?? m.role} tone={m.role.endsWith('roleAdmin') ? 'danger' : 'accent'} />
                  {m.disabled ? <Badge label="disabled" tone="warn" /> : null}
                </View>
              </View>
              {isAdmin ? (
                <View style={styles.rowActions}>
                  <Pressable
                    onPress={() =>
                      update.mutate({
                        did: m.did,
                        role:
                          m.role === 'tools.ozone.team.defs#roleAdmin'
                            ? 'tools.ozone.team.defs#roleModerator'
                            : 'tools.ozone.team.defs#roleAdmin',
                      })
                    }
                    style={[styles.smallButton, { borderColor }]}
                  >
                    <ThemedText style={styles.smallButtonLabel}>
                      {m.role === 'tools.ozone.team.defs#roleAdmin'
                        ? t('moderation.team.demote')
                        : t('moderation.team.promote')}
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => update.mutate({ did: m.did, disabled: !m.disabled })}
                    style={[styles.smallButton, { borderColor }]}
                  >
                    <ThemedText style={styles.smallButtonLabel}>
                      {m.disabled ? t('moderation.team.enable') : t('moderation.team.disable')}
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => del.mutate(m.did)}
                    style={[styles.smallButton, { borderColor: dangerColor }]}
                  >
                    <ThemedText style={[styles.smallButtonLabel, { color: dangerColor }]}>{t('moderation.team.remove')}</ThemedText>
                  </Pressable>
                </View>
              ) : null}
            </View>
            );
          })
        )}
      </ScrollView>
    </ThemedView>
  );
}

function AddTeamMemberModal({
  onClose,
  onSubmit,
  isPending,
  existingDids,
}: {
  onClose: () => void;
  onSubmit: (input: { did: string; role: string }) => void | Promise<void>;
  isPending: boolean;
  existingDids: Set<string>;
}) {
  const { t } = useTranslation();
  const borderColor = useBorderColor();
  const secondary = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const accent = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const inputBg = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<TypeaheadActor | null>(null);
  const [role, setRole] = useState(ROLE_OPTIONS[1].value);

  // DialogManager remounts this component on each open, so no reset
  // effect is needed — initial state above is the reset.

  const { data: matches, isLoading } = useTypeaheadActors(query);

  const isDid = query.trim().startsWith('did:');
  const canSubmit = !!selected || isDid;

  const handleSubmit = useCallback(() => {
    const did = selected?.did ?? (isDid ? query.trim() : null);
    if (!did) return;
    if (existingDids.has(did)) return;
    onSubmit({ did, role });
  }, [existingDids, isDid, onSubmit, query, role, selected]);

  return (
    <CenteredModal onClose={onClose} maxWidth={560} height="70%">
      <View style={styles.modalContents}>
        <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
          <ThemedText style={styles.modalTitle}>{t('moderation.team.modalTitle')}</ThemedText>
          <ThemedText style={[styles.modalSubtitle, { color: secondary }]}>
            {t('moderation.team.modalSubtitle')}
          </ThemedText>
        </View>

        <ScrollView style={styles.modalBodyScroll} contentContainerStyle={styles.modalBody}>
          <ThemedText style={[styles.fieldLabel, { color: secondary }]}>{t('moderation.team.accountLabel')}</ThemedText>
          <TextInput
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              // Drop the selected actor as soon as the user edits the
              // search — otherwise we'd submit a stale DID.
              if (selected && text !== `@${selected.handle}` && text !== selected.handle) {
                setSelected(null);
              }
            }}
            placeholder="@alice.example or did:plc:…"
            placeholderTextColor={secondary}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { color: textColor, borderColor, backgroundColor: inputBg }]}
          />

          {selected ? (
            <View
              style={[
                styles.suggestionRow,
                styles.suggestionSelected,
                { borderColor: accent, backgroundColor: `${accent}11` },
              ]}
            >
              <Avatar uri={selected.avatar} handle={selected.handle} size={36} />
              <View style={styles.suggestionBody}>
                <ThemedText style={styles.suggestionName} numberOfLines={1}>
                  {selected.displayName ?? selected.handle}
                </ThemedText>
                <ThemedText style={[styles.suggestionHandle, { color: secondary }]} numberOfLines={1}>
                  @{selected.handle}
                </ThemedText>
              </View>
              <ThemedText style={[styles.suggestionMeta, { color: accent }]}>{t('moderation.team.selected')}</ThemedText>
            </View>
          ) : isDid ? (
            <ThemedText style={[styles.helper, { color: secondary }]}>
              {t('moderation.team.didHelper')}
            </ThemedText>
          ) : query.trim().length >= 2 ? (
            isLoading && (!matches || matches.length === 0) ? (
              <ThemedText style={[styles.helper, { color: secondary }]}>{t('moderation.team.searching')}</ThemedText>
            ) : matches && matches.length > 0 ? (
              <View style={styles.suggestionList}>
                {matches.map((actor) => {
                  const isExisting = existingDids.has(actor.did);
                  return (
                    <Pressable
                      key={actor.did}
                      disabled={isExisting}
                      onPress={() => {
                        setSelected(actor);
                        setQuery(`@${actor.handle}`);
                      }}
                      style={({ pressed }) => [
                        styles.suggestionRow,
                        { borderColor },
                        pressed && { opacity: 0.6 },
                        isExisting && { opacity: 0.5 },
                      ]}
                    >
                      <Avatar uri={actor.avatar} handle={actor.handle} size={36} />
                      <View style={styles.suggestionBody}>
                        <ThemedText style={styles.suggestionName} numberOfLines={1}>
                          {actor.displayName ?? actor.handle}
                        </ThemedText>
                        <ThemedText
                          style={[styles.suggestionHandle, { color: secondary }]}
                          numberOfLines={1}
                        >
                          @{actor.handle}
                        </ThemedText>
                      </View>
                      {isExisting ? (
                        <ThemedText style={[styles.suggestionMeta, { color: secondary }]}>
                          {t('moderation.team.onTeam')}
                        </ThemedText>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <ThemedText style={[styles.helper, { color: secondary }]}>
                {t('moderation.team.noMatches')}
              </ThemedText>
            )
          ) : (
            <ThemedText style={[styles.helper, { color: secondary }]}>
              {t('moderation.team.typeToSearch')}
            </ThemedText>
          )}

          <ThemedText style={[styles.fieldLabel, { color: secondary }]}>{t('moderation.team.roleLabel')}</ThemedText>
          <View style={styles.roleChips}>
            {ROLE_OPTIONS.map((r) => {
              const active = role === r.value;
              return (
                <Pressable
                  key={r.value}
                  onPress={() => setRole(r.value)}
                  style={[
                    styles.roleChip,
                    {
                      borderColor: active ? accent : borderColor,
                      backgroundColor: active ? `${accent}22` : 'transparent',
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.roleChipLabel,
                      active ? { color: accent, fontWeight: fontWeight.semibold } : null,
                    ]}
                  >
                    {r.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={[styles.modalFooter, { borderTopColor: borderColor }]}>
          <Pressable
            onPress={onClose}
            disabled={isPending}
            style={[styles.footerButton, { borderColor }]}
          >
            <ThemedText style={styles.footerButtonLabel}>{t('moderation.team.cancel')}</ThemedText>
          </Pressable>
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit || isPending}
            style={[
              styles.footerButton,
              styles.footerButtonPrimary,
              { backgroundColor: accent },
              (!canSubmit || isPending) && { opacity: 0.6 },
            ]}
          >
            <ThemedText style={[styles.footerButtonLabel, styles.footerButtonLabelPrimary]}>
              {isPending ? t('moderation.team.adding') : t('moderation.team.addMemberCta')}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </CenteredModal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
  },
  roleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  roleChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  roleChipLabel: {
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
  list: { paddingBottom: spacing.xxl },
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.md,
    alignItems: 'center',
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
  rowHandle: {
    fontSize: fontSize.sm,
  },
  rowBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  rowActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
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
  modalContents: { flex: 1 },
  modalHeader: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    gap: spacing.xs,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
  },
  modalSubtitle: {
    fontSize: fontSize.sm,
  },
  modalBodyScroll: { flex: 1 },
  modalBody: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonPrimary: {
    borderColor: 'transparent',
  },
  footerButtonLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  footerButtonLabelPrimary: {
    color: '#ffffff',
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },
  helper: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  suggestionList: {
    gap: spacing.xs,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
    borderWidth: 1,
  },
  suggestionSelected: {
    // visual treatment lives on the inline style (borderColor / bg)
  },
  suggestionBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  suggestionName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  suggestionHandle: {
    fontSize: fontSize.sm,
  },
  suggestionMeta: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
});
