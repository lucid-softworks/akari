import React, { useCallback, useMemo } from 'react';

import type { BlueskyActorStatusView } from '@/bluesky-api';
import { GoLiveDialog } from '@/components/GoLiveDialog';
import type { MenuItem } from '@/components/ui/Menu';
import { useDialogManager } from '@/contexts/DialogContext';
import { useLiveNow } from '@/hooks/queries/useLiveNow';
import { useTranslation } from '@/hooks/useTranslation';
import { isProfileLive } from '@/utils/liveStatus';

type UseProfileLiveArgs = {
  profile: { did?: string; status?: BlueskyActorStatusView };
  isOwnProfile: boolean;
  /** Base overflow-menu rows (from useProfileMenuItems). */
  menuItems: readonly MenuItem[];
};

type UseProfileLiveResult = {
  /** Whether the profile should render the LIVE badge. */
  isLive: boolean;
  /** Opens the go-live editor; undefined when this isn't the viewer's profile. */
  onGoLive?: () => void;
  /** Menu rows with the go-live entry prepended for the viewer's own profile. */
  menuItems: readonly MenuItem[];
};

/**
 * Live-status wiring for the profile header: computes the LIVE badge state
 * from the profile's `app.bsky.actor.status`, exposes a handler that opens
 * the {@link GoLiveDialog}, and (for the viewer's own profile) prepends a
 * "Go live" / "Edit live status" row to the overflow menu.
 *
 * Kept out of ProfileHeader so the header component stays focused.
 */
export function useProfileLive({
  profile,
  isOwnProfile,
  menuItems,
}: UseProfileLiveArgs): UseProfileLiveResult {
  const { t } = useTranslation();
  const dialogManager = useDialogManager();
  const { data: liveNowEntries = [] } = useLiveNow();

  const isLive = isProfileLive(profile.status, profile.did, liveNowEntries);

  const onGoLive = useCallback(() => {
    const id = 'go-live';
    dialogManager.open({
      id,
      component: (
        <GoLiveDialog
          did={profile.did}
          status={profile.status}
          onClose={() => dialogManager.close(id)}
        />
      ),
    });
  }, [dialogManager, profile.did, profile.status]);

  const resolvedMenuItems = useMemo<readonly MenuItem[]>(() => {
    if (!isOwnProfile) return menuItems;
    return [
      {
        key: 'goLive',
        icon: 'play.fill',
        label: isLive ? t('live.editStatus') : t('live.goLive'),
        onPress: onGoLive,
      },
      ...menuItems,
    ];
  }, [isOwnProfile, isLive, menuItems, onGoLive, t]);

  return {
    isLive,
    onGoLive: isOwnProfile ? onGoLive : undefined,
    menuItems: resolvedMenuItems,
  };
}
