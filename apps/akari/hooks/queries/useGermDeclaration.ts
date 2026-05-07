import { useQuery } from '@tanstack/react-query';

import { resolveDidToPds } from '@/utils/oauth/discovery';

const COLLECTION = 'com.germnetwork.declaration';
const RKEY = 'self';

export type GermShowButtonTo =
  | 'everyone'
  | 'all'
  | 'anyone'
  | 'usersIFollow'
  | 'mutuals'
  | 'none'
  | 'noOne';

export type GermDeclaration = {
  /** Base URL for the Germ landing page; the per-conversation route is
   *  appended client-side as `/web/#{otherDid}+{myDid}`. */
  messageMeUrl?: string;
  /** Audience the user is willing to receive Germ messages from. */
  showButtonTo?: GermShowButtonTo | string;
};

type DeclarationRecord = {
  messageMe?: GermDeclaration;
};

type GetRecordResponse<T> = {
  uri: string;
  cid: string;
  value: T;
};

async function fetchGermDeclaration(did: string): Promise<DeclarationRecord | null> {
  const pdsUrl = await resolveDidToPds(did);
  const url = new URL(`${pdsUrl}/xrpc/com.atproto.repo.getRecord`);
  url.searchParams.set('repo', did);
  url.searchParams.set('collection', COLLECTION);
  url.searchParams.set('rkey', RKEY);

  const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  // 4xx — most commonly RecordNotFound — just means the user hasn't published
  // a Germ declaration. That's an expected, no-op case (button stays hidden),
  // not an error to surface to react-query.
  if (response.status >= 400 && response.status < 500) return null;
  if (!response.ok) throw new Error(`getRecord failed: ${response.status}`);

  const json = (await response.json()) as GetRecordResponse<DeclarationRecord>;
  return json.value;
}

/**
 * Decide whether the target's `messageMe.showButtonTo` audience permits the
 * current viewer to see the message button. Conservative on unknown values —
 * if the lexicon evolves and the target picks an audience we don't recognise,
 * we hide the button rather than risk leaking a contact path.
 */
export function germButtonVisibleFor(
  showButtonTo: string | undefined,
  viewerFollowedByTarget: boolean,
  viewerFollowsTarget: boolean,
): boolean {
  // Default (field absent) treats it as everyone — we have a Germ declaration
  // for the target, so omitting the audience is most reasonably "any Germ user".
  if (!showButtonTo) return true;
  switch (showButtonTo) {
    case 'everyone':
    case 'all':
    case 'anyone':
      return true;
    case 'usersIFollow':
      // Target said "users I follow"; for the current viewer that's true when
      // the target follows the viewer — i.e. `viewer.followedBy` is set.
      return viewerFollowedByTarget;
    case 'mutuals':
      return viewerFollowedByTarget && viewerFollowsTarget;
    case 'none':
    case 'noOne':
    default:
      return false;
  }
}

/**
 * Look up a user's `com.germnetwork.declaration/self` record. Returns `null`
 * when the record is missing (the common case — most users don't have one),
 * the parsed value otherwise. Read-only XRPC; no auth required.
 */
export function useGermDeclaration(did: string | undefined | null) {
  return useQuery({
    queryKey: ['germDeclaration', did],
    queryFn: () => fetchGermDeclaration(did!),
    enabled: !!did,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
