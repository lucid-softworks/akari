import { BlueskyApiClient } from 'bluesky-api';

import type {
  OzoneEmitEventInput,
  OzoneListScheduledActionsOptions,
  OzoneListScheduledActionsResponse,
  OzoneListTeamMembersResponse,
  OzoneModEvent,
  OzoneQueryEventsOptions,
  OzoneQueryEventsResponse,
  OzoneQueryStatusesOptions,
  OzoneQueryStatusesResponse,
  OzoneScheduleActionInput,
  OzoneScheduleActionResponse,
  OzoneSearchReposOptions,
  OzoneSearchReposResponse,
} from './types';

/**
 * Thin XRPC bindings for `tools.ozone.*` endpoints.
 *
 * Every call is sent to the user's PDS with
 * `atproto-proxy: <ozoneDid>#atproto_labeler`, which makes the PDS
 * forward the request to the named Ozone labeler service. Callers
 * supply the Ozone DID per request — each Ozone instance (the official
 * Bluesky moderation service, community labelers, etc.) is its own DID,
 * so this client does not hard-code one.
 *
 * The base class (`BlueskyApiClient`) is intentionally borrowed from
 * `bluesky-api` so we get DPoP, rate limiting, refresh, and the rest
 * of the XRPC plumbing for free. Note that the `appViewProxyDid`
 * constructor arg is ignored for Ozone calls — the per-method
 * `atproto-proxy` header overrides any AppView routing.
 *
 * Coverage is intentionally narrow: just enough Tier-1 (read) endpoints
 * to drive the moderation reader page. `emitEvent`, scheduled actions,
 * safelink, sets, signatures, team admin, and verification grants will
 * land as the UI for them ships.
 */
export class BlueskyOzone extends BlueskyApiClient {
  private proxy(ozoneDid: string): Record<string, string> {
    return { 'atproto-proxy': `${ozoneDid}#atproto_labeler` };
  }

  /**
   * List members of the Ozone team. Used to gate the moderation UI:
   * the tab only renders when the signed-in DID is in this list with a
   * recognised role.
   */
  async listTeamMembers(
    accessJwt: string,
    ozoneDid: string,
    options: { limit?: number; cursor?: string; q?: string; disabled?: boolean; roles?: string[] } = {},
  ): Promise<OzoneListTeamMembersResponse> {
    const params: Record<string, string | string[]> = {};
    if (options.limit) params.limit = String(options.limit);
    if (options.cursor) params.cursor = options.cursor;
    if (options.q) params.q = options.q;
    if (typeof options.disabled === 'boolean') params.disabled = String(options.disabled);
    if (options.roles && options.roles.length > 0) params.roles = options.roles;
    return this.makeAuthenticatedRequest<OzoneListTeamMembersResponse>(
      '/tools.ozone.team.listMembers',
      accessJwt,
      { params, headers: this.proxy(ozoneDid) },
    );
  }

  /** Query subject statuses (the moderation queue). */
  async queryStatuses(
    accessJwt: string,
    ozoneDid: string,
    options: OzoneQueryStatusesOptions = {},
  ): Promise<OzoneQueryStatusesResponse> {
    return this.makeAuthenticatedRequest<OzoneQueryStatusesResponse>(
      '/tools.ozone.moderation.queryStatuses',
      accessJwt,
      { params: serializeParams(options), headers: this.proxy(ozoneDid) },
    );
  }

  /** Query the moderation event log (the audit trail). */
  async queryEvents(
    accessJwt: string,
    ozoneDid: string,
    options: OzoneQueryEventsOptions = {},
  ): Promise<OzoneQueryEventsResponse> {
    return this.makeAuthenticatedRequest<OzoneQueryEventsResponse>(
      '/tools.ozone.moderation.queryEvents',
      accessJwt,
      { params: serializeParams(options), headers: this.proxy(ozoneDid) },
    );
  }

  /** Get a single repo (account) view. */
  async getRepo(
    accessJwt: string,
    ozoneDid: string,
    did: string,
  ): Promise<Record<string, unknown>> {
    return this.makeAuthenticatedRequest(
      '/tools.ozone.moderation.getRepo',
      accessJwt,
      { params: { did }, headers: this.proxy(ozoneDid) },
    );
  }

  /** Get a single record view by AT URI. */
  async getRecord(
    accessJwt: string,
    ozoneDid: string,
    uri: string,
    cid?: string,
  ): Promise<Record<string, unknown>> {
    const params: Record<string, string> = { uri };
    if (cid) params.cid = cid;
    return this.makeAuthenticatedRequest(
      '/tools.ozone.moderation.getRecord',
      accessJwt,
      { params, headers: this.proxy(ozoneDid) },
    );
  }

  /**
   * Full timeline of mod + identity events for one account, interleaved
   * chronologically.
   */
  async getAccountTimeline(
    accessJwt: string,
    ozoneDid: string,
    did: string,
    cursor?: string,
    limit?: number,
  ): Promise<{ timeline: Record<string, unknown>[]; cursor?: string }> {
    const params: Record<string, string> = { did };
    if (cursor) params.cursor = cursor;
    if (limit) params.limit = String(limit);
    return this.makeAuthenticatedRequest(
      '/tools.ozone.moderation.getAccountTimeline',
      accessJwt,
      { params, headers: this.proxy(ozoneDid) },
    );
  }

  /** Reporter stats — used in the sidebar of a report detail pane. */
  async getReporterStats(
    accessJwt: string,
    ozoneDid: string,
    dids: string[],
  ): Promise<{ stats: Record<string, unknown>[] }> {
    return this.makeAuthenticatedRequest(
      '/tools.ozone.moderation.getReporterStats',
      accessJwt,
      { params: { dids }, headers: this.proxy(ozoneDid) },
    );
  }

  // -------------------------------------------------------------------
  // Tier 2: write endpoints
  // -------------------------------------------------------------------

  /**
   * Take a moderation action on a subject. The single emit endpoint
   * fans out to many event types — comment, label, takedown, escalate,
   * acknowledge, resolve appeal, mute reporter, tag, etc. — selected
   * via the `event.$type` discriminator.
   */
  async emitEvent(
    accessJwt: string,
    ozoneDid: string,
    input: OzoneEmitEventInput,
  ): Promise<OzoneModEvent> {
    return this.makeAuthenticatedRequest<OzoneModEvent>(
      '/tools.ozone.moderation.emitEvent',
      accessJwt,
      {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
        headers: this.proxy(ozoneDid),
      },
    );
  }

  /** Schedule a moderation action for the future. */
  async scheduleAction(
    accessJwt: string,
    ozoneDid: string,
    input: OzoneScheduleActionInput,
  ): Promise<OzoneScheduleActionResponse> {
    return this.makeAuthenticatedRequest<OzoneScheduleActionResponse>(
      '/tools.ozone.moderation.scheduleAction',
      accessJwt,
      {
        method: 'POST',
        body: input as unknown as Record<string, unknown>,
        headers: this.proxy(ozoneDid),
      },
    );
  }

  /** Cancel one or more pending scheduled actions by id. */
  async cancelScheduledActions(
    accessJwt: string,
    ozoneDid: string,
    subjects: string[],
    comment?: string,
  ): Promise<{ results: { subject: string; success: boolean; errorMessage?: string }[] }> {
    return this.makeAuthenticatedRequest(
      '/tools.ozone.moderation.cancelScheduledActions',
      accessJwt,
      {
        method: 'POST',
        body: { subjects, comment },
        headers: this.proxy(ozoneDid),
      },
    );
  }

  /** List scheduled actions, with optional filters. */
  async listScheduledActions(
    accessJwt: string,
    ozoneDid: string,
    options: OzoneListScheduledActionsOptions = {},
  ): Promise<OzoneListScheduledActionsResponse> {
    return this.makeAuthenticatedRequest<OzoneListScheduledActionsResponse>(
      '/tools.ozone.moderation.listScheduledActions',
      accessJwt,
      {
        method: 'POST',
        body: options as unknown as Record<string, unknown>,
        headers: this.proxy(ozoneDid),
      },
    );
  }

  /** Free-text repo (account) search — used to look up subjects to action. */
  async searchRepos(
    accessJwt: string,
    ozoneDid: string,
    options: OzoneSearchReposOptions = {},
  ): Promise<OzoneSearchReposResponse> {
    return this.makeAuthenticatedRequest<OzoneSearchReposResponse>(
      '/tools.ozone.moderation.searchRepos',
      accessJwt,
      { params: serializeParams(options), headers: this.proxy(ozoneDid) },
    );
  }

  // -------------------------------------------------------------------
  // Communication templates (used by emitEvent's email subtype)
  // -------------------------------------------------------------------

  async listCommTemplates(
    accessJwt: string,
    ozoneDid: string,
  ): Promise<{ communicationTemplates: Record<string, unknown>[] }> {
    return this.makeAuthenticatedRequest(
      '/tools.ozone.communication.listTemplates',
      accessJwt,
      { headers: this.proxy(ozoneDid) },
    );
  }

  async createCommTemplate(
    accessJwt: string,
    ozoneDid: string,
    input: {
      name: string;
      contentMarkdown: string;
      subject?: string;
      lang?: string;
      createdBy?: string;
    },
  ): Promise<Record<string, unknown>> {
    return this.makeAuthenticatedRequest(
      '/tools.ozone.communication.createTemplate',
      accessJwt,
      {
        method: 'POST',
        body: input,
        headers: this.proxy(ozoneDid),
      },
    );
  }

  async updateCommTemplate(
    accessJwt: string,
    ozoneDid: string,
    input: {
      id: string;
      name?: string;
      contentMarkdown?: string;
      subject?: string;
      lang?: string;
      disabled?: boolean;
      updatedBy?: string;
    },
  ): Promise<Record<string, unknown>> {
    return this.makeAuthenticatedRequest(
      '/tools.ozone.communication.updateTemplate',
      accessJwt,
      {
        method: 'POST',
        body: input,
        headers: this.proxy(ozoneDid),
      },
    );
  }

  async deleteCommTemplate(
    accessJwt: string,
    ozoneDid: string,
    id: string,
  ): Promise<void> {
    await this.makeAuthenticatedRequest(
      '/tools.ozone.communication.deleteTemplate',
      accessJwt,
      {
        method: 'POST',
        body: { id },
        headers: this.proxy(ozoneDid),
      },
    );
  }

  // -------------------------------------------------------------------
  // Tier 3: team admin
  // -------------------------------------------------------------------

  async addTeamMember(
    accessJwt: string,
    ozoneDid: string,
    input: { did: string; role: string },
  ): Promise<Record<string, unknown>> {
    return this.makeAuthenticatedRequest(
      '/tools.ozone.team.addMember',
      accessJwt,
      { method: 'POST', body: input, headers: this.proxy(ozoneDid) },
    );
  }

  async updateTeamMember(
    accessJwt: string,
    ozoneDid: string,
    input: { did: string; role?: string; disabled?: boolean },
  ): Promise<Record<string, unknown>> {
    return this.makeAuthenticatedRequest(
      '/tools.ozone.team.updateMember',
      accessJwt,
      { method: 'POST', body: input, headers: this.proxy(ozoneDid) },
    );
  }

  async deleteTeamMember(
    accessJwt: string,
    ozoneDid: string,
    did: string,
  ): Promise<void> {
    await this.makeAuthenticatedRequest(
      '/tools.ozone.team.deleteMember',
      accessJwt,
      { method: 'POST', body: { did }, headers: this.proxy(ozoneDid) },
    );
  }

  // -------------------------------------------------------------------
  // Tier 3: safelink rules (URL allow/deny lists)
  // -------------------------------------------------------------------

  async querySafelinkEvents(
    accessJwt: string,
    ozoneDid: string,
    options: { urls?: string[]; patternType?: string; cursor?: string; limit?: number } = {},
  ): Promise<{ events: Record<string, unknown>[]; cursor?: string }> {
    return this.makeAuthenticatedRequest(
      '/tools.ozone.safelink.queryEvents',
      accessJwt,
      { method: 'POST', body: options as Record<string, unknown>, headers: this.proxy(ozoneDid) },
    );
  }

  async querySafelinkRules(
    accessJwt: string,
    ozoneDid: string,
    options: { urls?: string[]; cursor?: string; limit?: number } = {},
  ): Promise<{ rules: Record<string, unknown>[]; cursor?: string }> {
    return this.makeAuthenticatedRequest(
      '/tools.ozone.safelink.queryRules',
      accessJwt,
      { method: 'POST', body: options as Record<string, unknown>, headers: this.proxy(ozoneDid) },
    );
  }

  async addSafelinkRule(
    accessJwt: string,
    ozoneDid: string,
    input: {
      url: string;
      pattern: 'domain' | 'url';
      action: 'block' | 'warn' | 'whitelist';
      reason: string;
      comment?: string;
      createdBy?: string;
    },
  ): Promise<Record<string, unknown>> {
    return this.makeAuthenticatedRequest(
      '/tools.ozone.safelink.addRule',
      accessJwt,
      { method: 'POST', body: input, headers: this.proxy(ozoneDid) },
    );
  }

  async removeSafelinkRule(
    accessJwt: string,
    ozoneDid: string,
    input: { url: string; pattern: 'domain' | 'url'; comment?: string; createdBy?: string },
  ): Promise<Record<string, unknown>> {
    return this.makeAuthenticatedRequest(
      '/tools.ozone.safelink.removeRule',
      accessJwt,
      { method: 'POST', body: input, headers: this.proxy(ozoneDid) },
    );
  }

  // -------------------------------------------------------------------
  // Tier 3: sets
  // -------------------------------------------------------------------

  async listSets(
    accessJwt: string,
    ozoneDid: string,
    options: { limit?: number; cursor?: string; namePrefix?: string } = {},
  ): Promise<{ sets: Record<string, unknown>[]; cursor?: string }> {
    const params: Record<string, string> = {};
    if (options.limit) params.limit = String(options.limit);
    if (options.cursor) params.cursor = options.cursor;
    if (options.namePrefix) params.namePrefix = options.namePrefix;
    return this.makeAuthenticatedRequest(
      '/tools.ozone.set.querySets',
      accessJwt,
      { params, headers: this.proxy(ozoneDid) },
    );
  }

  async upsertSet(
    accessJwt: string,
    ozoneDid: string,
    input: { name: string; description?: string },
  ): Promise<Record<string, unknown>> {
    return this.makeAuthenticatedRequest(
      '/tools.ozone.set.upsertSet',
      accessJwt,
      { method: 'POST', body: input, headers: this.proxy(ozoneDid) },
    );
  }

  async deleteSet(
    accessJwt: string,
    ozoneDid: string,
    name: string,
  ): Promise<void> {
    await this.makeAuthenticatedRequest(
      '/tools.ozone.set.deleteSet',
      accessJwt,
      { method: 'POST', body: { name }, headers: this.proxy(ozoneDid) },
    );
  }

  // -------------------------------------------------------------------
  // Tier 3: signatures
  // -------------------------------------------------------------------

  async findRelatedAccounts(
    accessJwt: string,
    ozoneDid: string,
    did: string,
  ): Promise<{ accounts: Record<string, unknown>[]; cursor?: string }> {
    return this.makeAuthenticatedRequest(
      '/tools.ozone.signature.findRelatedAccounts',
      accessJwt,
      { params: { did }, headers: this.proxy(ozoneDid) },
    );
  }

  async findCorrelation(
    accessJwt: string,
    ozoneDid: string,
    dids: string[],
  ): Promise<{ details: Record<string, unknown>[] }> {
    return this.makeAuthenticatedRequest(
      '/tools.ozone.signature.findCorrelation',
      accessJwt,
      { params: { dids }, headers: this.proxy(ozoneDid) },
    );
  }

  // -------------------------------------------------------------------
  // Tier 3: verification grants
  // -------------------------------------------------------------------

  async listVerifications(
    accessJwt: string,
    ozoneDid: string,
    options: { issuers?: string[]; subjects?: string[]; cursor?: string; limit?: number } = {},
  ): Promise<{ verifications: Record<string, unknown>[]; cursor?: string }> {
    const params: Record<string, string | string[]> = {};
    if (options.issuers && options.issuers.length > 0) params.issuers = options.issuers;
    if (options.subjects && options.subjects.length > 0) params.subjects = options.subjects;
    if (options.cursor) params.cursor = options.cursor;
    if (options.limit) params.limit = String(options.limit);
    return this.makeAuthenticatedRequest(
      '/tools.ozone.verification.listVerifications',
      accessJwt,
      { params, headers: this.proxy(ozoneDid) },
    );
  }

  async grantVerifications(
    accessJwt: string,
    ozoneDid: string,
    input: {
      verifications: { subject: string; handle: string; displayName: string; createdAt?: string }[];
    },
  ): Promise<{ verifications: Record<string, unknown>[] }> {
    return this.makeAuthenticatedRequest(
      '/tools.ozone.verification.grantVerifications',
      accessJwt,
      { method: 'POST', body: input as Record<string, unknown>, headers: this.proxy(ozoneDid) },
    );
  }

  async revokeVerifications(
    accessJwt: string,
    ozoneDid: string,
    uris: string[],
    revokeReason?: string,
  ): Promise<{ revokedVerifications: string[]; failedRevocations: { uri: string; error: string }[] }> {
    return this.makeAuthenticatedRequest(
      '/tools.ozone.verification.revokeVerifications',
      accessJwt,
      {
        method: 'POST',
        body: { uris, revokeReason },
        headers: this.proxy(ozoneDid),
      },
    );
  }
}

/**
 * Coerce an options object into the {string | string[]} shape XRPC expects.
 * Drops undefined/null/empty entries and stringifies booleans + numbers.
 */
function serializeParams(options: Record<string, unknown>): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      if (value.length > 0) params[key] = value.map(String);
    } else if (typeof value === 'boolean' || typeof value === 'number') {
      params[key] = String(value);
    } else if (typeof value === 'string' && value.length > 0) {
      params[key] = value;
    }
  }
  return params;
}
