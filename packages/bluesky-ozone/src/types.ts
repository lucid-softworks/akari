// ---------------------------------------------------------------------------
// Loose types for tools.ozone.* responses. Most subject / event payloads
// use Record<string, unknown> because the underlying schemas evolve and
// the moderation UI renders best-effort views — we don't need exhaustive
// typings to ship Tier 1.
// ---------------------------------------------------------------------------

export type OzoneListTeamMembersResponse = {
  members: OzoneTeamMember[];
  cursor?: string;
};

export type OzoneTeamMember = {
  did: string;
  /**
   * Role enum from `tools.ozone.team.defs#memberRole`. Common values:
   * `tools.ozone.team.defs#roleAdmin`,
   * `tools.ozone.team.defs#roleModerator`,
   * `tools.ozone.team.defs#roleTriage`,
   * `tools.ozone.team.defs#roleVerifier`.
   */
  role: string;
  disabled?: boolean;
  profile?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

/** Roles that should unlock the moderation UI. Helper for clients. */
export const OZONE_MOD_ROLES = [
  'tools.ozone.team.defs#roleAdmin',
  'tools.ozone.team.defs#roleModerator',
  'tools.ozone.team.defs#roleTriage',
  'tools.ozone.team.defs#roleVerifier',
] as const;

export type OzoneQueryStatusesOptions = {
  subject?: string;
  comment?: string;
  reviewState?: string;
  takendown?: boolean;
  appealed?: boolean;
  hostingDeletedAfter?: string;
  hostingDeletedBefore?: string;
  hostingUpdatedAfter?: string;
  hostingUpdatedBefore?: string;
  hostingStatuses?: string[];
  reportedAfter?: string;
  reportedBefore?: string;
  reviewedAfter?: string;
  reviewedBefore?: string;
  includeMuted?: boolean;
  onlyMuted?: boolean;
  ignoreSubjects?: string[];
  lastReviewedBy?: string;
  sortField?: 'lastReviewedAt' | 'lastReportedAt';
  sortDirection?: 'asc' | 'desc';
  tags?: string[];
  excludeTags?: string[];
  collections?: string[];
  subjectType?: 'account' | 'record';
  minAccountSuspendCount?: number;
  minReportedRecordsCount?: number;
  minTakendownRecordsCount?: number;
  minPriorityScore?: number;
  queueCount?: number;
  queueIndex?: number;
  queueSeed?: string;
  limit?: number;
  cursor?: string;
};

export type OzoneQueryStatusesResponse = {
  subjectStatuses: OzoneSubjectStatus[];
  cursor?: string;
};

export type OzoneSubjectStatus = {
  id: number;
  subject: Record<string, unknown>;
  hosting?: Record<string, unknown>;
  subjectBlobCids?: string[];
  subjectRepoHandle?: string;
  updatedAt: string;
  createdAt: string;
  reviewState: string;
  comment?: string;
  muteUntil?: string;
  muteReportingUntil?: string;
  lastReviewedBy?: string;
  lastReviewedAt?: string;
  lastReportedAt?: string;
  lastAppealedAt?: string;
  takendown?: boolean;
  appealed?: boolean;
  suspendUntil?: string;
  tags?: string[];
  accountStats?: Record<string, unknown>;
  recordsStats?: Record<string, unknown>;
  priorityScore?: number;
};

export type OzoneQueryEventsOptions = {
  types?: string[];
  createdBy?: string;
  sortDirection?: 'asc' | 'desc';
  createdAfter?: string;
  createdBefore?: string;
  subject?: string;
  collections?: string[];
  subjectType?: 'account' | 'record';
  includeAllUserRecords?: boolean;
  limit?: number;
  hasComment?: boolean;
  comment?: string;
  addedLabels?: string[];
  removedLabels?: string[];
  addedTags?: string[];
  removedTags?: string[];
  reportTypes?: string[];
  policies?: string[];
  modTool?: string;
  ageAssuranceState?: string;
  cursor?: string;
};

export type OzoneQueryEventsResponse = {
  events: OzoneModEvent[];
  cursor?: string;
};

export type OzoneModEvent = {
  id: number;
  event: Record<string, unknown> & { $type?: string };
  subject: Record<string, unknown>;
  subjectBlobCids?: string[];
  createdBy: string;
  createdAt: string;
  creatorHandle?: string;
  subjectHandle?: string;
};

// ---------------------------------------------------------------------------
// Tier 2 — write endpoint payload shapes.
// Subject shapes mirror lexicon unions: `repoRef` for accounts,
// `strongRef` for individual records. Event shapes are the union of
// modEvent* lexicons; we keep them loose-typed because the set is large
// and evolving — callers stamp `$type` and any subtype-specific fields.
// ---------------------------------------------------------------------------

export type OzoneSubjectRepoRef = {
  $type: 'com.atproto.admin.defs#repoRef';
  did: string;
};

export type OzoneSubjectStrongRef = {
  $type: 'com.atproto.repo.strongRef';
  uri: string;
  cid: string;
};

export type OzoneSubject = OzoneSubjectRepoRef | OzoneSubjectStrongRef;

/** Identifiers for the common event subtypes. Useful for action pickers. */
export const OZONE_EVENT_TYPES = {
  comment: 'tools.ozone.moderation.defs#modEventComment',
  acknowledge: 'tools.ozone.moderation.defs#modEventAcknowledge',
  escalate: 'tools.ozone.moderation.defs#modEventEscalate',
  resolveAppeal: 'tools.ozone.moderation.defs#modEventResolveAppeal',
  label: 'tools.ozone.moderation.defs#modEventLabel',
  takedown: 'tools.ozone.moderation.defs#modEventTakedown',
  reverseTakedown: 'tools.ozone.moderation.defs#modEventReverseTakedown',
  mute: 'tools.ozone.moderation.defs#modEventMute',
  unmute: 'tools.ozone.moderation.defs#modEventUnmute',
  muteReporter: 'tools.ozone.moderation.defs#modEventMuteReporter',
  unmuteReporter: 'tools.ozone.moderation.defs#modEventUnmuteReporter',
  email: 'tools.ozone.moderation.defs#modEventEmail',
  tag: 'tools.ozone.moderation.defs#modEventTag',
  divert: 'tools.ozone.moderation.defs#modEventDivert',
  priorityScore: 'tools.ozone.moderation.defs#modEventPriorityScore',
} as const;

export type OzoneEventType = (typeof OZONE_EVENT_TYPES)[keyof typeof OZONE_EVENT_TYPES];

/** Shape of `tools.ozone.moderation.emitEvent`'s POST body. */
export type OzoneEmitEventInput = {
  event: { $type: OzoneEventType } & Record<string, unknown>;
  subject: OzoneSubject;
  subjectBlobCids?: string[];
  createdBy: string;
  /** Optional metadata about the tool / UI that emitted the event. */
  modTool?: { name: string; meta?: Record<string, unknown> };
};

/** Shape of `tools.ozone.moderation.scheduleAction`'s POST body. */
export type OzoneScheduleActionInput = {
  action: { $type: OzoneEventType } & Record<string, unknown>;
  subjects: string[];
  createdBy: string;
  scheduling: {
    /** ISO 8601 timestamp for the earliest run time. */
    executeAt?: string;
    /** Alternatively, a relative delay in seconds. */
    executeAfter?: number;
    /** Random jitter window in seconds. */
    randomizeExecution?: number;
  };
  modTool?: { name: string; meta?: Record<string, unknown> };
};

export type OzoneScheduleActionResponse = {
  results: { subject: string; success: boolean; errorMessage?: string }[];
};

export type OzoneListScheduledActionsOptions = {
  statuses?: ('pending' | 'executed' | 'cancelled' | 'failed')[];
  subjects?: string[];
  startsAfter?: string;
  endsBefore?: string;
  cursor?: string;
  limit?: number;
};

export type OzoneListScheduledActionsResponse = {
  actions: Record<string, unknown>[];
  cursor?: string;
};

export type OzoneSearchReposOptions = {
  q?: string;
  cursor?: string;
  limit?: number;
};

export type OzoneSearchReposResponse = {
  repos: Record<string, unknown>[];
  cursor?: string;
};
