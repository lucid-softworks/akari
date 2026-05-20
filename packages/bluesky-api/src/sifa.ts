import { BlueskyApiClient } from './client';

/**
 * Minimal client for the `id.sifa.*` lexicons (Sifa — professional
 * profiles on AT Protocol). Tier 1 of akari's integration only reads
 * the three core records needed for a "Resume" profile tab:
 *
 *   - `id.sifa.profile.self` — singleton (rkey: `self`) with headline,
 *     about, openTo / preferredWorkplace, etc.
 *   - `id.sifa.profile.position` — work history entries (TID rkeys)
 *   - `id.sifa.profile.education` — education credentials (TID rkeys)
 *
 * Source lexicons live at https://github.com/singi-labs/sifa-lexicons.
 * Endorsements, meetings, follows, skills, certifications, courses,
 * honors, languages, projects, publications, volunteering, and
 * external accounts are intentionally out of scope for this read-only
 * tier.
 */

type BlobRef = {
  $type: 'blob';
  ref: { $link: string };
  mimeType: string;
  size: number;
};

export type SifaSelfRecord = {
  uri: string;
  cid: string;
  value: {
    $type: 'id.sifa.profile.self';
    displayName?: string;
    avatar?: BlobRef;
    pronouns?: string;
    headline?: string;
    about?: string;
    industries?: unknown[];
    location?: unknown;
    openTo?: string[];
    preferredWorkplace?: string[];
    availableFromUtc?: number;
    availableToUtc?: number;
    langs?: string[];
    discoverable?: boolean;
    createdAt: string;
  };
};

export type SifaPositionRecord = {
  uri: string;
  cid: string;
  value: {
    $type: 'id.sifa.profile.position';
    company: string;
    companyDid?: string;
    title: string;
    description?: string;
    employmentType?: string;
    workplaceType?: string;
    location?: unknown;
    startedAt: string;
    endedAt?: string;
    skills?: unknown[];
    isPrimary?: boolean;
    createdAt: string;
  };
};

export type SifaEducationRecord = {
  uri: string;
  cid: string;
  value: {
    $type: 'id.sifa.profile.education';
    institution: string;
    institutionDid?: string;
    degree?: string;
    fieldOfStudy?: string;
    grade?: string;
    activities?: string;
    description?: string;
    location?: unknown;
    startedAt?: string;
    endedAt?: string;
    createdAt: string;
  };
};

export type SifaPositionRecordsResponse = {
  records: SifaPositionRecord[];
  cursor?: string;
};

export type SifaEducationRecordsResponse = {
  records: SifaEducationRecord[];
  cursor?: string;
};

export class BlueskySifa extends BlueskyApiClient {
  /**
   * Reads the actor's `id.sifa.profile.self` record. Returns null when
   * the actor doesn't use sifa.
   */
  async getProfileSelf(
    accessJwt: string,
    repo: string,
  ): Promise<SifaSelfRecord | null> {
    try {
      return await this.makeAuthenticatedRequest<SifaSelfRecord>(
        '/com.atproto.repo.getRecord',
        accessJwt,
        {
          params: {
            repo,
            collection: 'id.sifa.profile.self',
            rkey: 'self',
          },
        },
      );
    } catch (error) {
      const e = error as { errorCode?: string; status?: number };
      if (e.errorCode === 'RecordNotFound' || e.status === 404) return null;
      // Treat all other failures as "no sifa profile" so the tab can
      // safely hide. A 401 from a stricter PDS shouldn't crash the
      // profile page.
      return null;
    }
  }

  /**
   * Lists `id.sifa.profile.position` records on the actor's repo.
   */
  async getActorPositions(
    accessJwt: string,
    repo: string,
    limit: number = 50,
    cursor?: string,
  ): Promise<SifaPositionRecordsResponse> {
    const params: Record<string, string> = {
      repo,
      collection: 'id.sifa.profile.position',
      limit: limit.toString(),
    };
    if (cursor) params.cursor = cursor;
    try {
      return await this.makeAuthenticatedRequest<SifaPositionRecordsResponse>(
        '/com.atproto.repo.listRecords',
        accessJwt,
        { params },
      );
    } catch {
      return { records: [], cursor: undefined };
    }
  }

  /**
   * Lists `id.sifa.profile.education` records on the actor's repo.
   */
  async getActorEducation(
    accessJwt: string,
    repo: string,
    limit: number = 50,
    cursor?: string,
  ): Promise<SifaEducationRecordsResponse> {
    const params: Record<string, string> = {
      repo,
      collection: 'id.sifa.profile.education',
      limit: limit.toString(),
    };
    if (cursor) params.cursor = cursor;
    try {
      return await this.makeAuthenticatedRequest<SifaEducationRecordsResponse>(
        '/com.atproto.repo.listRecords',
        accessJwt,
        { params },
      );
    } catch {
      return { records: [], cursor: undefined };
    }
  }
}

/**
 * Builds a PDS-direct blob URL for a sifa avatar blob.
 */
export function buildSifaAvatarUrl(
  pdsUrl: string,
  did: string,
  cid: string,
): string {
  return `${pdsUrl}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;
}

/**
 * Humanises a sifa knownValue (`id.sifa.defs#fullTime` → `Full-time`).
 * Keeps the badge readable when we don't have a localized label yet.
 * The sifa lexicon publishes these as enum-like strings; we strip the
 * NSID prefix and split camelCase into words.
 */
export function humanizeSifaToken(value: string | undefined): string {
  if (!value) return '';
  const bare = value.replace(/^.*#/, '');
  if (!bare) return '';
  const spaced = bare.replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
