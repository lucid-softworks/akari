import { ListPickerSheet } from '@/components/ListPickerSheet';
import { ReportSheet } from '@/components/ReportSheet';
import type { useProfile } from '@/hooks/queries/useProfile';

type ProfileShape = NonNullable<ReturnType<typeof useProfile>['data']>;

export type ProfileActionVisibility = {
  reportSheet: boolean;
  listPicker?: boolean;
};

type ProfileActionSheetsProps = {
  profile: ProfileShape | undefined;
  visibility: ProfileActionVisibility;
  onDismissReportSheet: () => void;
  onDismissListPicker?: () => void;
};

/**
 * Modal layers shown over the profile view: report sheet and (optionally)
 * the list picker. The `…` menu itself now lives inline next to the
 * trigger via `<Menu>` in `ProfileActionButtons`, so it no longer needs
 * coordinated visibility wiring.
 *
 * `onDismissListPicker` and `listPicker` are optional so the
 * blocked-relationship branch can omit the list picker entirely.
 */
export function ProfileActionSheets({
  profile,
  visibility,
  onDismissReportSheet,
  onDismissListPicker,
}: ProfileActionSheetsProps) {
  const { reportSheet, listPicker } = visibility;
  return (
    <>
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
