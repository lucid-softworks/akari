import { useQuery } from '@tanstack/react-query';

import { BlueskyApi } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import type { PostControls, ReplyAllow } from '@/utils/postControls';
import { DEFAULT_POST_CONTROLS } from '@/utils/postControls';

const TG_RULE = {
  mention: 'app.bsky.feed.threadgate#mentionRule',
  following: 'app.bsky.feed.threadgate#followingRule',
  follower: 'app.bsky.feed.threadgate#followerRule',
  list: 'app.bsky.feed.threadgate#listRule',
} as const;

type ThreadgateRecord = {
  allow?: { $type: string; list?: string }[];
};

type PostgateRecord = {
  embeddingRules?: { $type: string }[];
};

/**
 * Reads the current threadgate + postgate records for one of the user's
 * own posts, so the "Edit who can reply" sheet can prefill with the actual
 * state instead of opening at defaults.
 *
 * Both records live at the same rkey as the post itself, in their
 * dedicated collections. Either may be missing (404), which we map to the
 * defaults — meaning everyone can reply / quote.
 */
export function useExistingPostControls(postUri: string | undefined) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useQuery<PostControls>({
    queryKey: ['existingPostControls', currentAccount?.pdsUrl, postUri] as const,
    enabled: !!token && !!currentAccount?.pdsUrl && !!postUri,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!token || !currentAccount?.pdsUrl || !postUri) {
        return DEFAULT_POST_CONTROLS;
      }
      const rkey = postUri.split('/').pop();
      const repo = postUri.split('/')[2];
      if (!rkey || !repo) return DEFAULT_POST_CONTROLS;

      const api = new BlueskyApi(currentAccount.pdsUrl);

      // Fetch both records in parallel; either can be missing (404).
      const [threadgateRes, postgateRes] = await Promise.allSettled([
        fetchRecord<ThreadgateRecord>(api, token, repo, 'app.bsky.feed.threadgate', rkey),
        fetchRecord<PostgateRecord>(api, token, repo, 'app.bsky.feed.postgate', rkey),
      ]);

      const replyAllow = decodeThreadgate(
        threadgateRes.status === 'fulfilled' ? threadgateRes.value : null,
      );
      const allowQuote = decodePostgate(
        postgateRes.status === 'fulfilled' ? postgateRes.value : null,
      );

      return { replyAllow, allowQuote };
    },
  });
}

async function fetchRecord<T>(
  api: BlueskyApi,
  token: string,
  repo: string,
  collection: string,
  rkey: string,
): Promise<T | null> {
  try {
    // Use the underlying client request via a reusable helper. We don't
    // expose a dedicated getRecord on the public API, so fetch directly.
    const url = new URL('/xrpc/com.atproto.repo.getRecord', (api as unknown as { baseUrl: string }).baseUrl);
    url.searchParams.set('repo', repo);
    url.searchParams.set('collection', collection);
    url.searchParams.set('rkey', rkey);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { value?: T };
    return body.value ?? null;
  } catch {
    return null;
  }
}

function decodeThreadgate(record: ThreadgateRecord | null): ReplyAllow {
  if (!record) return { type: 'everyone' };
  // `allow` undefined → everyone can reply (lexicon default).
  if (!record.allow) return { type: 'everyone' };
  // `allow: []` → nobody can reply.
  if (record.allow.length === 0) return { type: 'nobody' };
  const limited: Extract<ReplyAllow, { type: 'limited' }> = { type: 'limited' };
  const listUris: string[] = [];
  for (const rule of record.allow) {
    if (rule.$type === TG_RULE.mention) limited.mention = true;
    else if (rule.$type === TG_RULE.following) limited.following = true;
    else if (rule.$type === TG_RULE.follower) limited.follower = true;
    else if (rule.$type === TG_RULE.list && rule.list) listUris.push(rule.list);
  }
  if (listUris.length > 0) limited.listUris = listUris;
  return limited;
}

function decodePostgate(record: PostgateRecord | null): boolean {
  if (!record) return true;
  return !(record.embeddingRules ?? []).some(
    (r) => r.$type === 'app.bsky.feed.postgate#disableRule',
  );
}
