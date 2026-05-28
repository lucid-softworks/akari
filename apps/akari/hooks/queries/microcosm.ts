/**
 * Shared composition for the "AppView disabled" code paths inside the
 * query hooks. Each function combines `slingshot-api`, `constellation-api`,
 * direct PDS reads, and PLC directory lookups into the BlueskyApi-shaped
 * objects the rest of the app expects.
 *
 * This file deliberately sits next to the hooks rather than in `utils/`:
 * the contents *are* hook-level composition (just expressed as plain async
 * functions so multiple hooks can share them without forcing each consumer
 * to become a React hook).
 */

import { ConstellationApi } from '@/constellation-api';
import { SlingshotApi } from '@/slingshot-api';
import type {
  BlueskyAuthor,
  BlueskyFeed,
  BlueskyFeedItem,
  BlueskyListView,
  BlueskyPostView,
  BlueskyProfile,
  BlueskyStarterPack,
  PollRecord,
  PollRecordValue,
  PollVoteRecordValue,
} from '@/bluesky-api';

const PLC_DIRECTORY_BASE = 'https://plc.directory';
const DEFAULT_CDN_BASE = 'https://cdn.bsky.app';

let slingshotClient: SlingshotApi | null = null;
function slingshot(): SlingshotApi {
  if (!slingshotClient) slingshotClient = new SlingshotApi();
  return slingshotClient;
}

let constellationClient: ConstellationApi | null = null;
function constellation(): ConstellationApi {
  if (!constellationClient) constellationClient = new ConstellationApi();
  return constellationClient;
}

export type ParsedAtUri = { repo: string; collection: string; rkey: string };

const AT_URI_RE = /^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/;

/** Parse `at://did/collection/rkey` into its parts. Returns `null` on a malformed input. */
export function parseAtUri(uri: string): ParsedAtUri | null {
  const m = AT_URI_RE.exec(uri);
  if (!m) return null;
  return { repo: m[1], collection: m[2], rkey: m[3] };
}

type BlobRef = { $type?: string; ref?: { $link?: string } | string; mimeType?: string };

/** Pull the blob CID out of an `app.bsky.actor.profile` avatar/banner field. */
function blobCid(blob: unknown): string | undefined {
  if (!blob || typeof blob !== 'object') return undefined;
  const ref = (blob as BlobRef).ref;
  if (typeof ref === 'string') return ref;
  if (ref && typeof ref === 'object' && typeof ref.$link === 'string') return ref.$link;
  return undefined;
}

/**
 * Construct a CDN URL for a blob ref. Path layout is identical across bsky's
 * CDN and known mirrors, so a host swap suffices to honour the user's CDN
 * preset elsewhere in the app.
 */
export function constructBlobUrl(
  did: string,
  cid: string,
  format: 'avatar' | 'banner' | 'feed_thumbnail' | 'feed_fullsize' = 'avatar',
  cdnBase: string = DEFAULT_CDN_BASE,
): string {
  return `${cdnBase}/img/${format}/plain/${did}/${cid}@jpeg`;
}

/**
 * DID → primary handle. `did:web:` is trivial; `did:plc:` requires hitting
 * the PLC directory for the DID document's `alsoKnownAs`. Returns
 * `undefined` rather than throwing so callers can fall back to the raw DID.
 */
export async function resolveDidToHandle(did: string): Promise<string | undefined> {
  if (did.startsWith('did:web:')) {
    return did.slice('did:web:'.length).split(':')[0] || undefined;
  }
  if (!did.startsWith('did:plc:')) return undefined;
  try {
    const res = await fetch(`${PLC_DIRECTORY_BASE}/${did}/data`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { alsoKnownAs?: string[] };
    const aka = data.alsoKnownAs?.find((s) => s.startsWith('at://'));
    return aka ? aka.slice('at://'.length) : undefined;
  } catch {
    return undefined;
  }
}

export type AtprotoRecord<T = unknown> = { uri: string; cid: string; value: T };
export type PdsListRecordsResponse<T = unknown> = { records: AtprotoRecord<T>[]; cursor?: string };

/**
 * Page of records from a repo via `com.atproto.repo.listRecords` on the
 * given PDS. Slingshot doesn't expose listRecords (verified — returns 404),
 * so for repo-listing operations we hit the repo's hosting PDS directly.
 * The endpoint is public for public records — no auth header needed.
 */
export async function pdsListRecords<T = unknown>(args: {
  pdsUrl: string;
  repo: string;
  collection: string;
  limit?: number;
  cursor?: string;
  reverse?: boolean;
}): Promise<PdsListRecordsResponse<T>> {
  const url = new URL('/xrpc/com.atproto.repo.listRecords', args.pdsUrl);
  url.searchParams.set('repo', args.repo);
  url.searchParams.set('collection', args.collection);
  if (args.limit !== undefined) url.searchParams.set('limit', String(args.limit));
  if (args.cursor) url.searchParams.set('cursor', args.cursor);
  if (args.reverse) url.searchParams.set('reverse', 'true');
  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`pds listRecords ${args.collection} failed (${res.status})`);
  return (await res.json()) as PdsListRecordsResponse<T>;
}

/**
 * Fetch a DID's `app.bsky.actor.profile/self` record via slingshot and
 * resolve the handle via PLC, returning a `BlueskyAuthor`-shaped object.
 * AppView-only fields (`associated`, `viewer`, `labels`, …) are filled
 * with permissive defaults — those aren't authoritative without an AppView.
 */
export async function getAuthor(did: string, cdnBase: string = DEFAULT_CDN_BASE): Promise<BlueskyAuthor> {
  const [profileRes, handle] = await Promise.all([
    slingshot()
      .getRecord<{ displayName?: string; avatar?: unknown }>({
        repo: did,
        collection: 'app.bsky.actor.profile',
        rkey: 'self',
      })
      .catch(() => null),
    resolveDidToHandle(did),
  ]);

  const profileValue = profileRes?.value;
  const avatarCid = blobCid(profileValue?.avatar);
  const avatar = avatarCid ? constructBlobUrl(did, avatarCid, 'avatar', cdnBase) : '';
  return {
    did,
    handle: handle ?? did,
    displayName: profileValue?.displayName ?? '',
    avatar,
    associated: { lists: 0, feedgens: 0, starterPacks: 0, labeler: false, chat: { allowIncoming: 'none' } },
    viewer: { muted: false, blockedBy: false },
    labels: [],
    createdAt: '',
  };
}

type PostCounts = { likeCount: number; repostCount: number; replyCount: number };

/** Pure assembly — given an already-fetched record + author + counts, produce a `BlueskyPostView`. */
function assemblePostView(
  record: AtprotoRecord<Record<string, unknown>>,
  author: BlueskyAuthor,
  counts: PostCounts,
): BlueskyPostView {
  const createdAt =
    typeof record.value.createdAt === 'string' ? (record.value.createdAt as string) : new Date().toISOString();
  return {
    uri: record.uri,
    cid: record.cid,
    author,
    record: record.value,
    indexedAt: createdAt,
    labels: [],
    embed: (record.value.embed as BlueskyPostView['embed']) ?? undefined,
    langs: Array.isArray(record.value.langs) ? (record.value.langs as string[]) : undefined,
    facets: Array.isArray(record.value.facets) ? (record.value.facets as BlueskyPostView['facets']) : undefined,
    tags: Array.isArray(record.value.tags) ? (record.value.tags as string[]) : undefined,
    likeCount: counts.likeCount,
    repostCount: counts.repostCount,
    replyCount: counts.replyCount,
  };
}

/**
 * Slingshot getRecord for a post + author hydration + constellation
 * engagement counts, composed into a `BlueskyPostView`. The composition
 * shows up in usePost, usePinnedPost, useParentPost/useRootPost, and the
 * per-reply hydration inside usePostThread.
 */
export async function getPostView(atUri: string): Promise<BlueskyPostView> {
  const parsed = parseAtUri(atUri);
  if (!parsed) throw new Error(`Not a valid post URI: ${atUri}`);
  const [record, author, counts] = await Promise.all([
    slingshot().getRecord<Record<string, unknown>>(parsed),
    getAuthor(parsed.repo),
    constellation().getPostEngagementCounts(atUri),
  ]);
  return assemblePostView(record, author, counts);
}

/** Convenience: get reply URIs for a post via constellation, capped at `limit`. */
export async function getReplyUris(postUri: string, limit?: number): Promise<string[]> {
  return constellation().getReplyUris(postUri, limit);
}

export type AuthorFeedFilter = 'posts' | 'posts_with_replies' | 'posts_with_media' | 'posts_with_videos';

type PostRecord = {
  text?: string;
  createdAt?: string;
  reply?: { parent?: { uri?: string } };
  embed?: { $type?: string; media?: { $type?: string } };
};

function recordHasMedia(record: PostRecord): boolean {
  const embed = record.embed;
  if (!embed) return false;
  const type = embed.$type;
  if (type === 'app.bsky.embed.images' || type === 'app.bsky.embed.video') return true;
  if (type === 'app.bsky.embed.recordWithMedia') {
    const mediaType = embed.media?.$type;
    return mediaType === 'app.bsky.embed.images' || mediaType === 'app.bsky.embed.video';
  }
  return false;
}

function recordHasVideo(record: PostRecord): boolean {
  const embed = record.embed;
  if (!embed) return false;
  if (embed.$type === 'app.bsky.embed.video') return true;
  if (embed.$type === 'app.bsky.embed.recordWithMedia' && embed.media?.$type === 'app.bsky.embed.video') return true;
  return false;
}

/**
 * One page of an author's feed assembled from PDS-direct `listRecords`
 * (slingshot doesn't expose listRecords). Engagement counts come from
 * constellation; the author profile is fetched once and reused across
 * every post on the page.
 *
 * Limitations vs. the AppView path:
 *   - Reposts are not included — they live in a different collection
 *     (`app.bsky.feed.repost`) and would require a second listRecords +
 *     merge. The AppView feeds inline reposts via `reason`.
 *   - The `posts` filter excludes replies (matches AppView behaviour);
 *     `posts_with_replies` includes both; `posts_with_media` and
 *     `posts_with_videos` filter by embed shape.
 */
type ListRecord = {
  name?: string;
  purpose?: string;
  description?: string;
  avatar?: unknown;
  createdAt?: string;
};

type StarterpackRecord = {
  name?: string;
  description?: string;
  feeds?: string[];
  list?: string;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Microcosm-mode page of lists owned by a single actor: PDS listRecords on
 * `app.bsky.graph.list`, hydrated with the creator profile. `listItemCount`
 * and `viewer.*` are AppView-aggregated and stay undefined.
 */
export async function getActorListsPage(args: {
  did: string;
  pdsUrl: string;
  limit: number;
  cursor?: string;
}): Promise<{ lists: BlueskyListView[]; cursor?: string }> {
  const [page, author] = await Promise.all([
    pdsListRecords<ListRecord>({
      pdsUrl: args.pdsUrl,
      repo: args.did,
      collection: 'app.bsky.graph.list',
      limit: args.limit,
      cursor: args.cursor,
    }),
    getAuthor(args.did),
  ]);
  const creator = {
    did: author.did,
    handle: author.handle,
    displayName: author.displayName,
    avatar: author.avatar,
  };

  const lists = page.records.map((record): BlueskyListView => {
    const avatarCid = blobCid(record.value.avatar);
    return {
      uri: record.uri,
      cid: record.cid,
      name: record.value.name ?? '',
      purpose: record.value.purpose ?? 'app.bsky.graph.defs#curatelist',
      description: record.value.description,
      avatar: avatarCid ? constructBlobUrl(args.did, avatarCid, 'avatar') : undefined,
      creator,
      indexedAt: record.value.createdAt ?? new Date(0).toISOString(),
    };
  });

  return { lists, cursor: page.cursor };
}

/**
 * Microcosm-mode page of starterpacks owned by a single actor: PDS
 * listRecords on `app.bsky.graph.starterpack`, hydrated with the creator
 * profile. Join counts (`joinedWeekCount`, `joinedAllTimeCount`) are
 * AppView-only and stay at 0.
 */
export async function getActorStarterpacksPage(args: {
  did: string;
  pdsUrl: string;
  limit: number;
  cursor?: string;
}): Promise<{ starterPacks: BlueskyStarterPack[]; cursor?: string }> {
  const [page, creator] = await Promise.all([
    pdsListRecords<StarterpackRecord>({
      pdsUrl: args.pdsUrl,
      repo: args.did,
      collection: 'app.bsky.graph.starterpack',
      limit: args.limit,
      cursor: args.cursor,
    }),
    getAuthor(args.did),
  ]);

  const starterPacks = page.records.map((record): BlueskyStarterPack => {
    const createdAt = record.value.createdAt ?? new Date(0).toISOString();
    return {
      uri: record.uri,
      cid: record.cid,
      record: {
        $type: 'app.bsky.graph.starterpack',
        createdAt,
        description: record.value.description ?? '',
        feeds: record.value.feeds ?? [],
        list: record.value.list ?? '',
        name: record.value.name ?? '',
        updatedAt: record.value.updatedAt ?? createdAt,
      },
      creator,
      joinedWeekCount: 0,
      joinedAllTimeCount: 0,
      labels: [],
      indexedAt: createdAt,
    };
  });

  return { starterPacks, cursor: page.cursor };
}

/**
 * Microcosm-mode list of feed generators owned by an actor: PDS
 * listRecords on `app.bsky.feed.generator`, then hand each URI off to
 * `getFeedGeneratorViews` for the full hydration.
 */
export async function getActorFeedsPage(args: {
  did: string;
  pdsUrl: string;
  limit: number;
  cursor?: string;
}): Promise<{ feeds: BlueskyFeed[]; cursor?: string }> {
  const page = await pdsListRecords<unknown>({
    pdsUrl: args.pdsUrl,
    repo: args.did,
    collection: 'app.bsky.feed.generator',
    limit: args.limit,
    cursor: args.cursor,
  });
  const { feeds } = await getFeedGeneratorViews(page.records.map((r) => r.uri));
  return { feeds, cursor: page.cursor };
}

type FeedGeneratorRecord = {
  did: string;
  displayName?: string;
  description?: string;
  descriptionFacets?: BlueskyFeed['descriptionFacets'];
  avatar?: unknown;
  acceptsInteractions?: boolean;
  contentMode?: BlueskyFeed['contentMode'];
  createdAt?: string;
};

/**
 * Microcosm-mode hydration of feed generator metadata: for each feed URI,
 * fetch the `app.bsky.feed.generator/<rkey>` record from the creator's
 * repo via slingshot + hydrate the creator profile via `getAuthor`. Like
 * counts come from constellation; viewer state (`viewer.like`) and labels
 * are AppView-only and stay empty.
 */
export async function getFeedGeneratorViews(
  feedUris: string[],
  cdnBase: string = DEFAULT_CDN_BASE,
): Promise<{ feeds: BlueskyFeed[] }> {
  const feeds = await Promise.all(
    feedUris.map(async (uri): Promise<BlueskyFeed | null> => {
      const parsed = parseAtUri(uri);
      if (!parsed) return null;
      try {
        const [record, creator, likes] = await Promise.all([
          slingshot().getRecord<FeedGeneratorRecord>(parsed),
          getAuthor(parsed.repo, cdnBase),
          constellation()
            .getLinkCount({ target: uri, collection: 'app.bsky.feed.like', path: '.subject.uri' })
            .catch(() => ({ total: 0 })),
        ]);
        const avatarCid = blobCid(record.value.avatar);
        return {
          uri: record.uri,
          cid: record.cid,
          did: record.value.did,
          creator,
          displayName: record.value.displayName ?? '',
          description: record.value.description ?? '',
          descriptionFacets: record.value.descriptionFacets,
          avatar: avatarCid ? constructBlobUrl(parsed.repo, avatarCid, 'avatar', cdnBase) : undefined,
          likeCount: likes.total,
          acceptsInteractions: record.value.acceptsInteractions ?? false,
          labels: [],
          contentMode: record.value.contentMode ?? 'app.bsky.feed.defs#contentModeUnspecified',
          indexedAt: record.value.createdAt ?? new Date(0).toISOString(),
        };
      } catch {
        return null;
      }
    }),
  );
  return { feeds: feeds.filter((f): f is BlueskyFeed => f !== null) };
}

export async function getAuthorFeedPage(args: {
  identifier: string;
  filter: AuthorFeedFilter;
  limit: number;
  cursor?: string;
}): Promise<{ feed: BlueskyFeedItem[]; cursor?: string }> {
  const did = await resolveIdentifierToDid(args.identifier);
  const pdsUrl = await resolvePdsUrl(did);
  if (!pdsUrl) throw new Error(`Couldn't resolve PDS URL for ${did}`);

  const [page, author] = await Promise.all([
    pdsListRecords<PostRecord>({
      pdsUrl,
      repo: did,
      collection: 'app.bsky.feed.post',
      limit: args.limit,
      cursor: args.cursor,
      reverse: false,
    }),
    getAuthor(did),
  ]);

  const filtered = page.records.filter((record) => {
    const value = record.value;
    if (args.filter === 'posts') return !value.reply;
    if (args.filter === 'posts_with_replies') return true;
    if (args.filter === 'posts_with_media') return recordHasMedia(value);
    if (args.filter === 'posts_with_videos') return recordHasVideo(value);
    return true;
  });

  const feed = await Promise.all(
    filtered.map(async (record): Promise<BlueskyFeedItem> => {
      const counts = await constellation()
        .getPostEngagementCounts(record.uri)
        .catch(() => ({ likeCount: 0, repostCount: 0, replyCount: 0 }));
      return { post: assemblePostView(record, author, counts) };
    }),
  );

  return { feed, cursor: page.cursor };
}

/**
 * Followers count via constellation: number of distinct DIDs that have
 * written an `app.bsky.graph.follow` record pointing at `did`. Returns 0
 * on any failure so the profile still renders.
 */
export async function getFollowersCount(did: string): Promise<number> {
  try {
    const res = await constellation().getDistinctDidCount({
      target: did,
      collection: 'app.bsky.graph.follow',
      path: '.subject',
    });
    return res.total;
  } catch {
    return 0;
  }
}

/**
 * Resolve a handle-or-DID identifier to a DID. Already-DIDs are returned
 * unchanged; everything else goes through slingshot's resolveHandle.
 */
export async function resolveIdentifierToDid(identifier: string): Promise<string> {
  if (identifier.startsWith('did:')) return identifier;
  const res = await slingshot().resolveHandle(identifier);
  return res.did;
}

/**
 * Fetch a `tech.tokimeki.poll.poll` record by its at:// URI (via slingshot's
 * edge cache). Returns null if the URI is malformed or the record is gone.
 */
export async function getPollRecord(pollUri: string): Promise<PollRecord | null> {
  const parsed = parseAtUri(pollUri);
  if (!parsed) return null;
  try {
    const res = await slingshot().getRecord<PollRecordValue>(parsed);
    return { uri: res.uri, cid: res.cid, value: res.value };
  } catch {
    return null;
  }
}

/**
 * Tally a poll's votes across the network. Constellation gives the
 * back-referencing `tech.tokimeki.poll.vote` records (did + rkey) but not
 * their contents, so we fetch each one to read `optionIndex`. Capped at
 * `limit` records — accurate for typical polls; a sample for very large
 * ones (the headline `total` stays exact via the link count).
 */
export async function getPollVotes(
  pollUri: string,
  limit: number = 100,
): Promise<{ voters: { did: string; optionIndex: number }[]; total: number }> {
  const links = await constellation().getLinks({
    target: pollUri,
    collection: 'tech.tokimeki.poll.vote',
    path: '.poll.uri',
  });
  const sample = links.linking_records.slice(0, limit);
  const voters = await Promise.all(
    sample.map(async ({ did, collection, rkey }) => {
      try {
        const res = await slingshot().getRecord<PollVoteRecordValue>({ repo: did, collection, rkey });
        const idx = res.value?.optionIndex;
        return typeof idx === 'number' ? { did, optionIndex: idx } : null;
      } catch {
        return null;
      }
    }),
  );
  return {
    voters: voters.filter((v): v is { did: string; optionIndex: number } => v !== null),
    total: links.total,
  };
}

/**
 * Resolve a DID to its hosting PDS URL. Pulls the `service` array from the
 * DID document (PLC directory for did:plc, well-known for did:web) and
 * picks the `#atproto_pds` entry. Returns `undefined` on any failure so
 * callers can fall back to displaying a stub.
 */
type DidDocument = {
  service?: { id: string; type: string; serviceEndpoint: string }[];
};

export async function resolvePdsUrl(did: string): Promise<string | undefined> {
  try {
    let doc: DidDocument | null = null;
    if (did.startsWith('did:plc:')) {
      const res = await fetch(`${PLC_DIRECTORY_BASE}/${did}`, { headers: { Accept: 'application/json' } });
      if (!res.ok) return undefined;
      doc = (await res.json()) as DidDocument;
    } else if (did.startsWith('did:web:')) {
      const host = did.slice('did:web:'.length).split(':')[0];
      const res = await fetch(`https://${host}/.well-known/did.json`, { headers: { Accept: 'application/json' } });
      if (!res.ok) return undefined;
      doc = (await res.json()) as DidDocument;
    }
    const pds = doc?.service?.find((s) => s.type === 'AtprotoPersonalDataServer');
    return pds?.serviceEndpoint;
  } catch {
    return undefined;
  }
}

/**
 * Microcosm-mode `getProfile`: profile record via slingshot + handle via
 * PLC + follower count via constellation, returned as a `BlueskyProfile`.
 * Fields that need AppView aggregation (`postsCount`, `followsCount`,
 * `viewer.following`, `viewer.followedBy`, indexed labels) are left
 * undefined — the existing UI handles missing counts by hiding them.
 */
export async function getProfileView(
  identifier: string,
  cdnBase: string = DEFAULT_CDN_BASE,
): Promise<BlueskyProfile> {
  const did = await resolveIdentifierToDid(identifier);

  const [profileRes, handle, followersCount] = await Promise.all([
    slingshot()
      .getRecord<{
        displayName?: string;
        description?: string;
        avatar?: unknown;
        banner?: unknown;
        createdAt?: string;
        pronouns?: string;
        website?: string;
        pinnedPost?: { uri: string; cid: string };
      }>({ repo: did, collection: 'app.bsky.actor.profile', rkey: 'self' })
      .catch(() => null),
    resolveDidToHandle(did),
    getFollowersCount(did),
  ]);

  const profileValue = profileRes?.value;
  const avatarCid = blobCid(profileValue?.avatar);
  const bannerCid = blobCid(profileValue?.banner);

  return {
    did,
    handle: handle ?? did,
    displayName: profileValue?.displayName,
    description: profileValue?.description,
    pronouns: profileValue?.pronouns,
    website: profileValue?.website,
    avatar: avatarCid ? constructBlobUrl(did, avatarCid, 'avatar', cdnBase) : undefined,
    banner: bannerCid ? constructBlobUrl(did, bannerCid, 'banner', cdnBase) : undefined,
    createdAt: profileValue?.createdAt,
    indexedAt: profileValue?.createdAt ?? new Date(0).toISOString(),
    followersCount,
    // followsCount and postsCount need full-repo counts that listRecords
    // doesn't expose; leave undefined so the UI hides them.
    labels: [],
    pinnedPost: profileValue?.pinnedPost,
  };
}
