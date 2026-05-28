export type OzoneActionType =
  | 'comment'
  | 'acknowledge'
  | 'escalate'
  | 'resolveAppeal'
  | 'takedown'
  | 'reverseTakedown'
  | 'tag'
  | 'label'
  | 'mute'
  | 'unmute'
  | 'muteReporter'
  | 'unmuteReporter'
  | 'email';

export type ActionOption = {
  id: OzoneActionType;
  label: string;
  description: string;
  /**
   * Destructive actions get red styling in the chip grid AND on the
   * submit button. Only takedown / mute* qualify — they restrict
   * what the subject can do. Escalate / label / tag don't (they're
   * just routing or annotation), and the `reverse*` / `unmute*`
   * counterparts are restorative.
   */
  destructive?: boolean;
};

export const ACTION_OPTIONS: ActionOption[] = [
  { id: 'comment', label: 'Comment', description: 'Add an internal mod note.' },
  { id: 'acknowledge', label: 'Acknowledge', description: 'Mark as reviewed without taking action.' },
  { id: 'escalate', label: 'Escalate', description: 'Send to senior reviewers.' },
  { id: 'resolveAppeal', label: 'Resolve appeal', description: 'Close out an appealed subject.' },
  { id: 'takedown', label: 'Takedown', description: 'Hide the subject from the AppView.', destructive: true },
  { id: 'reverseTakedown', label: 'Reverse takedown', description: 'Restore a previously taken-down subject.' },
  { id: 'tag', label: 'Tag', description: 'Attach or remove operator tags.' },
  { id: 'label', label: 'Label', description: 'Apply or remove labels.' },
  { id: 'mute', label: 'Mute', description: 'Stop receiving reports about this subject.', destructive: true },
  { id: 'unmute', label: 'Unmute', description: 'Re-enable reports.' },
  { id: 'muteReporter', label: 'Mute reporter', description: 'Stop accepting reports from this reporter.', destructive: true },
  { id: 'unmuteReporter', label: 'Unmute reporter', description: 'Restore reports from this reporter.' },
  { id: 'email', label: 'Email', description: 'Send the subject an email through Ozone.' },
];
