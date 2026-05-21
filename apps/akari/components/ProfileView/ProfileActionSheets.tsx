import { ListPickerSheet } from '@/components/ListPickerSheet';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import { ReportSheet } from '@/components/ReportSheet';
import type { WebPortalAnchorRect } from '@/components/post/WebPortalDropdown';
import type { useProfile } from '@/hooks/queries/useProfile';

type ProfileShape = NonNullable<ReturnType<typeof useProfile>['data']>;

export type ProfileActionVisibility = {
  dropdown: boolean;
  reportSheet: boolean;
  listPicker?: boolean;
};

type ProfileActionSheetsProps = {
  profile: ProfileShape | undefined;
  isOwnProfile: boolean;
  visibility: ProfileActionVisibility;
  /** Bounding rect of the `…` trigger captured at open time, used to
   *  anchor the portaled web dropdown next to the button. */
  dropdownAnchorRect?: WebPortalAnchorRect | null;
  onDismissDropdown: () => void;
  onDismissReportSheet: () => void;
  onDismissListPicker?: () => void;
  onCopyLink: () => void;
  onSearchPosts: () => void;
  onAddToLists: () => void;
  onMuteAccount: () => void;
  onBlockPress: () => void;
  onReportAccount: () => void;
  onMessageOnGerm?: () => void;
};

/**
 * Bundles the three modal layers shown over the profile view —
 * dropdown menu, report sheet, and (optionally) the list picker —
 * so the parent screen only renders one element to wire up actions.
 *
 * `onDismissListPicker` and `showListPicker` are optional so the
 * blocked-relationship branch can omit the list picker entirely.
 */
export function ProfileActionSheets({
  profile,
  isOwnProfile,
  visibility,
  dropdownAnchorRect,
  onDismissDropdown,
  onDismissReportSheet,
  onDismissListPicker,
  onCopyLink,
  onSearchPosts,
  onAddToLists,
  onMuteAccount,
  onBlockPress,
  onReportAccount,
  onMessageOnGerm,
}: ProfileActionSheetsProps) {
  const { dropdown, reportSheet, listPicker } = visibility;
  return (
    <>
      <ProfileDropdown
        isVisible={dropdown}
        anchorRect={dropdownAnchorRect}
        onDismiss={onDismissDropdown}
        onCopyLink={onCopyLink}
        onSearchPosts={onSearchPosts}
        onAddToLists={onAddToLists}
        onMuteAccount={onMuteAccount}
        onBlockPress={onBlockPress}
        onReportAccount={onReportAccount}
        onMessageOnGerm={onMessageOnGerm}
        isFollowing={!!profile?.viewer?.following}
        isBlocking={!!profile?.viewer?.blocking}
        isMuted={!!profile?.viewer?.muted}
        isOwnProfile={isOwnProfile}
      />

      <ReportSheet
        visible={reportSheet}
        onDismiss={onDismissReportSheet}
        subject={profile?.did ? { type: 'account', did: profile.did } : null}
      />

      {listPicker !== undefined && onDismissListPicker ? (
        <ListPickerSheet
          visible={listPicker}
          onDismiss={onDismissListPicker}
          subjectDid={profile?.did}
        />
      ) : null}
    </>
  );
}
