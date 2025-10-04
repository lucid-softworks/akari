import { Jetstream, type CommitCreateEvent } from '@skyware/jetstream';
import { logger } from './logger.js';
import { ExpoNotifier } from './notifier.js';
import { didFromUri, normaliseDid } from './dids.js';
import { SubscriptionStore } from './subscription-store.js';
import type { ExpoNotificationPayload, InteractionReason, NotificationMessage, Subscription } from './types.js';

type FollowRecord = {
  subject: string;
  createdAt?: string;
};

type LikeRecord = {
  subject: {
    uri: string;
    cid: string;
  };
  createdAt?: string;
};

type RepostRecord = LikeRecord;

type ReplyRecord = {
  text?: string;
  createdAt?: string;
  reply?: {
    parent?: {
      uri: string;
      cid: string;
    };
    root?: {
      uri: string;
      cid: string;
    };
  };
};

const WATCHED_COLLECTIONS = [
  'app.bsky.graph.follow',
  'app.bsky.feed.like',
  'app.bsky.feed.post',
  'app.bsky.feed.repost',
] as const;

function createNotificationMessage(
  reason: InteractionReason,
  actorDid: string,
  payload: Partial<ExpoNotificationPayload>,
  textSnippet?: string,
): NotificationMessage {
  const actorLabel = actorDid;

  switch (reason) {
    case 'follow':
      return {
        title: 'New follower',
        body: `${actorLabel} followed you`,
        data: { reason, actorDid, ...payload },
      };
    case 'like':
      return {
        title: 'New like',
        body: `${actorLabel} liked your post`,
        data: { reason, actorDid, ...payload },
      };
    case 'repost':
      return {
        title: 'New repost',
        body: `${actorLabel} reposted your post`,
        data: { reason, actorDid, ...payload },
      };
    case 'reply':
      return {
        title: 'New reply',
        body: textSnippet ? `${actorLabel} replied: ${textSnippet}` : `${actorLabel} replied to your post`,
        data: { reason, actorDid, ...payload },
      };
  }
}

function createReplyUri(event: CommitCreateEvent<'app.bsky.feed.post'>): string {
  return `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`;
}

function truncateText(value: string | undefined, maxLength: number = 120): string | undefined {
  if (!value) return undefined;
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

export class FirehoseNotifier {
  private readonly jetstream: Jetstream<(typeof WATCHED_COLLECTIONS)[number]>;
  private readonly subscriptions: SubscriptionStore;
  private readonly notifier: ExpoNotifier;

  constructor(notifier: ExpoNotifier, subscriptions: SubscriptionStore) {
    this.jetstream = new Jetstream<(typeof WATCHED_COLLECTIONS)[number]>({
      wantedCollections: [...WATCHED_COLLECTIONS],
    });

    this.notifier = notifier;
    this.subscriptions = subscriptions;
  }

  start(): void {
    this.jetstream.on('open', () => logger.info('Connected to AT Protocol Jetstream.'));
    this.jetstream.on('close', () => logger.warn('Disconnected from AT Protocol Jetstream.'));
    this.jetstream.on('error', (error: unknown, cursor?: string) => {
      logger.error('Jetstream connection error.', {
        error: error instanceof Error ? error.message : error,
        cursor,
      });
    });

    this.jetstream.onCreate('app.bsky.graph.follow', (event) => {
      this.handleFollow(event);
    });

    this.jetstream.onCreate('app.bsky.feed.like', (event) => {
      this.handleLike(event);
    });

    this.jetstream.onCreate('app.bsky.feed.repost', (event) => {
      this.handleRepost(event);
    });

    this.jetstream.onCreate('app.bsky.feed.post', (event) => {
      this.handleReply(event);
    });

    this.jetstream.start();
  }

  stop(): void {
    this.jetstream.close();
  }

  private findSubscription(did: string | null): Subscription | undefined {
    return this.subscriptions.get(did);
  }

  private async notifySubscription(
    subscription: Subscription,
    reason: InteractionReason,
    actorDid: string,
    payload: Partial<ExpoNotificationPayload>,
    textSnippet?: string,
  ): Promise<void> {
    const message = createNotificationMessage(reason, actorDid, payload, textSnippet);
    await this.notifier.send(subscription, message);
  }

  private handleFollow(event: CommitCreateEvent<'app.bsky.graph.follow'>): void {
    const record = event.commit.record as unknown as FollowRecord;
    const targetDid = normaliseDid(record.subject);
    const subscription = this.findSubscription(targetDid);

    if (!subscription) return;
    if (normaliseDid(event.did) === targetDid) return;

    logger.debug('Processing follow event.', {
      follower: event.did,
      subject: record.subject,
    });

    void this.notifySubscription(subscription, 'follow', event.did, {});
  }

  private handleLike(event: CommitCreateEvent<'app.bsky.feed.like'>): void {
    const record = event.commit.record as unknown as LikeRecord;
    const targetDid = didFromUri(record.subject.uri);
    const subscription = this.findSubscription(targetDid);

    if (!subscription) return;
    if (normaliseDid(event.did) === targetDid) return;

    logger.debug('Processing like event.', {
      actor: event.did,
      subjectUri: record.subject.uri,
    });

    void this.notifySubscription(subscription, 'like', event.did, {
      subjectUri: record.subject.uri,
      recordCid: record.subject.cid,
    });
  }

  private handleRepost(event: CommitCreateEvent<'app.bsky.feed.repost'>): void {
    const record = event.commit.record as unknown as RepostRecord;
    const targetDid = didFromUri(record.subject.uri);
    const subscription = this.findSubscription(targetDid);

    if (!subscription) return;
    if (normaliseDid(event.did) === targetDid) return;

    logger.debug('Processing repost event.', {
      actor: event.did,
      subjectUri: record.subject.uri,
    });

    void this.notifySubscription(subscription, 'repost', event.did, {
      subjectUri: record.subject.uri,
      recordCid: record.subject.cid,
    });
  }

  private handleReply(event: CommitCreateEvent<'app.bsky.feed.post'>): void {
    const record = event.commit.record as unknown as ReplyRecord;
    if (!record.reply) return;

    const potentialTargets = new Set<string>();
    const parentDid = didFromUri(record.reply.parent?.uri);
    const rootDid = didFromUri(record.reply.root?.uri);

    if (parentDid) potentialTargets.add(parentDid);
    if (rootDid) potentialTargets.add(rootDid);

    const replyUri = createReplyUri(event);
    const textSnippet = truncateText(record.text);

    for (const did of potentialTargets) {
      const subscription = this.findSubscription(did);
      if (!subscription) continue;
      if (normaliseDid(event.did) === normaliseDid(subscription.did)) continue;

      logger.debug('Processing reply event.', {
        actor: event.did,
        target: subscription.did,
        replyUri,
      });

      void this.notifySubscription(subscription, 'reply', event.did, {
        replyUri,
        subjectUri: record.reply?.root?.uri ?? record.reply?.parent?.uri,
      }, textSnippet);
    }
  }
}
