import { BlueskyApi } from '@/bluesky-api';

/**
 * Best-effort batch profile lookup that fills `subjectAvatar` /
 * `creatorAvatar` shims on the loose ozone payloads. The wire shapes
 * carry handles but not avatars, so we hit `app.bsky.actor.getProfiles`
 * for the set of unique DIDs in a payload and merge the avatars in.
 *
 * Failures are swallowed: the moderation UI must remain usable even
 * when the AppView is slow or blocked. Rows simply fall back to the
 * initial-letter avatar.
 */
export async function fetchAvatarsByDid(
  api: BlueskyApi,
  accessJwt: string,
  dids: string[],
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(dids.filter((d) => d.startsWith('did:'))));
  const out = new Map<string, string>();
  if (unique.length === 0) return out;
  // getProfiles caps at 25 actors per call; chunk just in case.
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 25) {
    chunks.push(unique.slice(i, i + 25));
  }
  for (const chunk of chunks) {
    try {
      const response = await api.getProfiles(accessJwt, chunk);
      for (const profile of response.profiles) {
        if (profile.did && typeof profile.avatar === 'string') {
          out.set(profile.did, profile.avatar);
        }
      }
    } catch {
      // ignore — the row's initial-letter fallback covers it
    }
  }
  return out;
}

export type OzoneProfileLite = {
  avatar?: string;
  handle?: string;
  displayName?: string;
};

/**
 * Like {@link fetchAvatarsByDid} but returns the full profile-lite blob
 * (avatar + handle + displayName) per DID. Used by team / admin screens
 * that need to render handles, not raw DIDs.
 */
export async function fetchProfilesByDid(
  api: BlueskyApi,
  accessJwt: string,
  dids: string[],
): Promise<Map<string, OzoneProfileLite>> {
  const unique = Array.from(new Set(dids.filter((d) => d.startsWith('did:'))));
  const out = new Map<string, OzoneProfileLite>();
  if (unique.length === 0) return out;
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 25) {
    chunks.push(unique.slice(i, i + 25));
  }
  for (const chunk of chunks) {
    try {
      const response = await api.getProfiles(accessJwt, chunk);
      for (const profile of response.profiles) {
        if (!profile.did) continue;
        out.set(profile.did, {
          avatar: typeof profile.avatar === 'string' ? profile.avatar : undefined,
          handle: typeof profile.handle === 'string' ? profile.handle : undefined,
          displayName: typeof profile.displayName === 'string' ? profile.displayName : undefined,
        });
      }
    } catch {
      // ignore — caller falls back to DID + initial-letter avatar
    }
  }
  return out;
}

/**
 * Pull a DID out of an Ozone subject blob. Supports both the loose
 * `repoRef`/`strongRef` shapes the AppView returns.
 */
export function subjectDid(subject: Record<string, unknown> | undefined): string | undefined {
  if (!subject) return undefined;
  const direct = subject.did;
  if (typeof direct === 'string') return direct;
  const uri = subject.uri;
  if (typeof uri === 'string' && uri.startsWith('at://')) {
    const rest = uri.slice('at://'.length);
    const slash = rest.indexOf('/');
    return slash === -1 ? rest : rest.slice(0, slash);
  }
  return undefined;
}
