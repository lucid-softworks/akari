import { describe, expect, it } from 'vitest';

import type {
  BlueskyEmbed,
  BlueskyNestedRecord,
  BlueskyRecord,
  BlueskyRecordAuthor,
  BlueskyRecordValue,
} from '@/bluesky-api';

describe('RecordEmbed Data Structure Tests', () => {
  it('should create valid regular post embed', () => {
    const regularPostEmbed = {
      $type: 'app.bsky.embed.record#view',
      record: {
        uri: 'at://did:plc:test/app.bsky.feed.post/123',
        cid: 'test-cid',
        author: {
          did: 'did:plc:test',
          handle: 'testuser.bsky.social',
          displayName: 'Test User',
          avatar: 'https://example.com/avatar.jpg',
        } satisfies BlueskyRecordAuthor,
        value: {
          text: 'This is a regular post',
          createdAt: '2024-01-01T00:00:00.000Z',
        } satisfies BlueskyRecordValue,
        replyCount: 0,
        repostCount: 0,
        likeCount: 0,
        indexedAt: '2024-01-01T00:00:00.000Z',
      } satisfies BlueskyRecord,
    } satisfies BlueskyEmbed;

    expect(regularPostEmbed.$type).toBe('app.bsky.embed.record#view');
    expect(regularPostEmbed.record.value?.text).toBe('This is a regular post');
    expect(regularPostEmbed.record.author.handle).toBe('testuser.bsky.social');
  });

  it('should create valid quote post embed', () => {
    const quotePostEmbed = {
      $type: 'app.bsky.embed.recordWithMedia#view',
      record: {
        uri: 'at://did:plc:test/app.bsky.feed.post/456',
        cid: 'test-cid-2',
        author: {
          did: 'did:plc:quoter',
          handle: 'quoter.bsky.social',
          displayName: 'Quote User',
          avatar: 'https://example.com/quoter-avatar.jpg',
        } satisfies BlueskyRecordAuthor,
        record: {
          $type: 'app.bsky.embed.record#viewRecord',
          author: {
            did: 'did:plc:original',
            handle: 'original.bsky.social',
            displayName: 'Original User',
            avatar: 'https://example.com/original-avatar.jpg',
          } satisfies BlueskyRecordAuthor,
          value: {
            text: 'This is the original post being quoted',
            createdAt: '2024-01-01T00:00:00.000Z',
          } satisfies BlueskyRecordValue,
          uri: 'at://did:plc:original/app.bsky.feed.post/789',
          cid: 'original-cid',
          indexedAt: '2024-01-01T00:00:00.000Z',
          likeCount: 5,
          replyCount: 2,
          repostCount: 1,
        } satisfies BlueskyNestedRecord,
        value: {
          text: 'This is a quote post',
          createdAt: '2024-01-01T00:00:00.000Z',
        } satisfies BlueskyRecordValue,
        replyCount: 0,
        repostCount: 0,
        likeCount: 0,
        indexedAt: '2024-01-01T00:00:00.000Z',
      } satisfies BlueskyRecord,
    } satisfies BlueskyEmbed;

    expect(quotePostEmbed.$type).toBe('app.bsky.embed.recordWithMedia#view');
    expect(quotePostEmbed.record.record?.value?.text).toBe('This is the original post being quoted');
    expect(quotePostEmbed.record.record?.author?.handle).toBe('original.bsky.social');
  });

  it('should create valid blocked post embed', () => {
    const blockedPostEmbed = {
      $type: 'app.bsky.embed.record#view',
      record: {
        uri: 'at://did:plc:blocked/app.bsky.feed.post/999',
        cid: 'blocked-cid',
        $type: 'app.bsky.embed.record#viewBlocked',
        author: {
          did: 'did:plc:blocked',
          handle: 'blocked.bsky.social',
          displayName: 'Blocked User',
          avatar: 'https://example.com/blocked-avatar.jpg',
          viewer: {
            blockedBy: true,
          },
        } satisfies BlueskyRecordAuthor,
        replyCount: 0,
        repostCount: 0,
        likeCount: 0,
        indexedAt: '2024-01-01T00:00:00.000Z',
      } satisfies BlueskyRecord,
    } satisfies BlueskyEmbed;

    expect(blockedPostEmbed.record.$type).toBe('app.bsky.embed.record#viewBlocked');
    expect(blockedPostEmbed.record.author.viewer?.blockedBy).toBe(true);
  });

  it('should create valid blocked quote post embed', () => {
    const blockedQuoteEmbed = {
      $type: 'app.bsky.embed.recordWithMedia#view',
      record: {
        uri: 'at://did:plc:quoter/app.bsky.feed.post/456',
        cid: 'test-cid-2',
        author: {
          did: 'did:plc:quoter',
          handle: 'quoter.bsky.social',
          displayName: 'Quote User',
          avatar: 'https://example.com/quoter-avatar.jpg',
        } satisfies BlueskyRecordAuthor,
        record: {
          $type: 'app.bsky.embed.record#viewBlocked',
          author: {
            did: 'did:plc:blocked',
            handle: 'blocked.bsky.social',
            displayName: 'Blocked User',
            avatar: 'https://example.com/blocked-avatar.jpg',
            viewer: {
              blockedBy: true,
            },
          } satisfies BlueskyRecordAuthor,
          uri: 'at://did:plc:blocked/app.bsky.feed.post/789',
          cid: 'blocked-cid',
          indexedAt: '2024-01-01T00:00:00.000Z',
          likeCount: 0,
          replyCount: 0,
          repostCount: 0,
        } satisfies BlueskyNestedRecord,
        value: {
          text: 'This is a quote post with blocked content',
          createdAt: '2024-01-01T00:00:00.000Z',
        } satisfies BlueskyRecordValue,
        replyCount: 0,
        repostCount: 0,
        likeCount: 0,
        indexedAt: '2024-01-01T00:00:00.000Z',
      } satisfies BlueskyRecord,
    } satisfies BlueskyEmbed;

    expect(blockedQuoteEmbed.record.record?.$type).toBe('app.bsky.embed.record#viewBlocked');
    expect(blockedQuoteEmbed.record.record?.author?.viewer?.blockedBy).toBe(true);
  });

  it('should handle missing author information gracefully', () => {
    const embedWithMissingAuthor = {
      $type: 'app.bsky.embed.record#view',
      record: {
        uri: 'at://did:plc:test/app.bsky.feed.post/123',
        cid: 'test-cid',
        author: {
          did: 'did:plc:test',
          handle: 'testuser.bsky.social',
          displayName: '',
          avatar: '',
        } satisfies BlueskyRecordAuthor,
        value: {
          text: 'Post without display name',
          createdAt: '2024-01-01T00:00:00.000Z',
        } satisfies BlueskyRecordValue,
        replyCount: 0,
        repostCount: 0,
        likeCount: 0,
        indexedAt: '2024-01-01T00:00:00.000Z',
      } satisfies BlueskyRecord,
    } satisfies BlueskyEmbed;

    expect(embedWithMissingAuthor.record.value?.text).toBe('Post without display name');
    expect(embedWithMissingAuthor.record.author.handle).toBe('testuser.bsky.social');
    expect(embedWithMissingAuthor.record.author.displayName).toBe('');
  });

  it('should handle missing text content gracefully', () => {
    const embedWithoutText = {
      $type: 'app.bsky.embed.record#view',
      record: {
        uri: 'at://did:plc:test/app.bsky.feed.post/123',
        cid: 'test-cid',
        author: {
          did: 'did:plc:test',
          handle: 'testuser.bsky.social',
          displayName: 'Test User',
          avatar: 'https://example.com/avatar.jpg',
        } satisfies BlueskyRecordAuthor,
        value: {
          createdAt: '2024-01-01T00:00:00.000Z',
        } satisfies BlueskyRecordValue,
        replyCount: 0,
        repostCount: 0,
        likeCount: 0,
        indexedAt: '2024-01-01T00:00:00.000Z',
      } satisfies BlueskyRecord,
    } satisfies BlueskyEmbed;

    expect(embedWithoutText.record.author.displayName).toBe('Test User');
    expect(embedWithoutText.record.author.handle).toBe('testuser.bsky.social');
  });
});
