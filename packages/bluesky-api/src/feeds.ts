import { BlueskyApiClient } from './client';
import type {
  BlueskyBookmarksResponse,
  BlueskyFeedResponse,
  BlueskyFeedsResponse,
  BlueskyLikeResponse,
  BlueskyPostView,
  BlueskyStarterPacksResponse,
  BlueskyThreadResponse,
  BlueskyUnlikeResponse,
  BlueskyTrendingTopicsResponse,
  BlueskyCreatePostInput,
  BlueskyCreatePostResponse,
  BlueskyFeedGeneratorsResponse,
  BlueskyUploadBlobResponse,
} from './types';

/**
 * Bluesky API feed methods
 */
export class BlueskyFeeds extends BlueskyApiClient {
  /**
   * Gets the user's timeline feed
   * @param accessJwt - Valid access JWT token
   * @param limit - Number of posts to fetch (default: 20)
   * @returns Promise resolving to timeline data
   */
  async getTimeline(accessJwt: string, limit: number = 20): Promise<BlueskyFeedResponse> {
    return this.makeAuthenticatedRequest<BlueskyFeedResponse>('/app.bsky.feed.getTimeline', accessJwt, {
      params: { limit: limit.toString() },
      headers: {
        'atproto-accept-labelers':
          'did:plc:ar7c4by46qjdydhdevvrndac;redact, did:plc:gvkp7euswjjrctjmqwhhfzif;redact, did:plc:newitj5jo3uel7o4mnf3vj2o, did:plc:pbmxe3tfpkts72wi74weijpo, did:plc:wkoofae5uytcm7bjncmev6n6, did:plc:blwl5jhgk7eygww2bhkt56hg, did:plc:mjyeurqmqjeexbgigk3yytvb, did:plc:i65enriuag7n5fgkopbqtkyk, did:plc:zal76px7lfptnpgn4j3v6i7d, did:plc:wp7hxfjl5l4zlptn7y6774lk, did:plc:xpxsa5aviwecd7cv6bzbmr5n, did:plc:gwqqyezoxusulkn5g2nzd6t2, did:plc:xss2sw5p4bfhjqjorl7gk6z4, did:plc:mtbmlt62wuf454ztne5wacev, did:plc:bfsapbnzx54ypg2mgrflkjlx, did:plc:gclep67kb2bifr3praijwoun, did:plc:aksxl7qy5azlzfm2jstcwqtz, did:plc:yb2gz6yxpebbzlundrrfkv4d, did:plc:vfibt4bgozsdx6rnnnpha3x7',
      },
    });
  }

  /**
   * Gets the list of trending topics curated by Bluesky
   * @param limit - Number of topics to fetch (default: 10)
   * @returns Promise resolving to trending topics data
   */
  async getTrendingTopics(limit: number = 10): Promise<BlueskyTrendingTopicsResponse> {
    return this.makeRequest<BlueskyTrendingTopicsResponse>('/app.bsky.unspecced.getTrendingTopics', {
      params: { limit: limit.toString() },
    });
  }

  /**
   * Gets feed generators (feeds) created by an actor
   * @param accessJwt - Valid access JWT token
   * @param actor - The actor's DID or handle
   * @param limit - Number of feeds to fetch (default: 50, max: 100)
   * @param cursor - Pagination cursor
   * @returns Promise resolving to feeds data
   */
  async getFeeds(accessJwt: string, actor: string, limit: number = 50, cursor?: string): Promise<BlueskyFeedsResponse> {
    const params: Record<string, string> = {
      actor,
      limit: limit.toString(),
    };

    if (cursor) {
      params.cursor = cursor;
    }

    return this.makeAuthenticatedRequest<BlueskyFeedsResponse>('/app.bsky.feed.getActorFeeds', accessJwt, { params });
  }

  /**
   * Gets posts from a specific feed generator
   * @param accessJwt - Valid access JWT token
   * @param feed - The feed's URI
   * @param limit - Number of posts to fetch (default: 50, max: 100)
   * @param cursor - Pagination cursor
   * @returns Promise resolving to feed posts data
   */
  async getFeed(accessJwt: string, feed: string, limit: number = 50, cursor?: string): Promise<BlueskyFeedResponse> {
    const params: Record<string, string> = {
      feed,
      limit: limit.toString(),
    };

    if (cursor) {
      params.cursor = cursor;
    }

    return this.makeAuthenticatedRequest<BlueskyFeedResponse>('/app.bsky.feed.getFeed', accessJwt, { params });
  }

  /**
   * Gets feed generator metadata for specific feed URIs
   * @param accessJwt - Valid access JWT token
   * @param feeds - Array of feed URIs to get metadata for
   * @returns Promise resolving to feed generators data
   */
  async getFeedGenerators(accessJwt: string, feeds: string[]): Promise<BlueskyFeedGeneratorsResponse> {
    return this.makeAuthenticatedRequest<BlueskyFeedGeneratorsResponse>(
      '/app.bsky.feed.getFeedGenerators',
      accessJwt,
      {
        params: {
          feeds,
        },
      },
    );
  }

  /**
   * Gets the authenticated user's bookmarked posts
   * @param accessJwt - Valid access JWT token
   * @param limit - Number of bookmarks to fetch (default: 50, max: 100)
   * @param cursor - Pagination cursor
   * @returns Promise resolving to bookmarks data
   */
  async getBookmarks(
    accessJwt: string,
    limit: number = 50,
    cursor?: string,
  ): Promise<BlueskyBookmarksResponse> {
    const params: Record<string, string> = {
      limit: limit.toString(),
    };

    if (cursor) {
      params.cursor = cursor;
    }

    return this.makeAuthenticatedRequest<BlueskyBookmarksResponse>('/app.bsky.bookmark.getBookmarks', accessJwt, {
      params,
    });
  }

  /**
   * Adds a post to the authenticated user's bookmarks
   * @param accessJwt - Valid access JWT token
   * @param uri - The post's URI
   * @param cid - The post's CID
   */
  async addBookmark(accessJwt: string, uri: string, cid: string): Promise<void> {
    await this.makeAuthenticatedRequest<void>('/app.bsky.bookmark.addBookmark', accessJwt, {
      method: 'POST',
      body: { subject: { uri, cid } },
    });
  }

  /**
   * Removes a post from the authenticated user's bookmarks
   * @param accessJwt - Valid access JWT token
   * @param uri - The post's URI
   * @param cid - The post's CID
   */
  async removeBookmark(accessJwt: string, uri: string, cid: string): Promise<void> {
    await this.makeAuthenticatedRequest<void>('/app.bsky.bookmark.removeBookmark', accessJwt, {
      method: 'POST',
      body: { subject: { uri, cid } },
    });
  }

  /**
   * Gets a specific post by its URI
   * @param accessJwt - Valid access JWT token
   * @param uri - The post's URI
   * @returns Promise resolving to post data
   */
  async getPost(accessJwt: string, uri: string): Promise<BlueskyPostView> {
    const data = await this.makeAuthenticatedRequest<{
      thread?: { post: BlueskyPostView };
    }>('/app.bsky.feed.getPostThread', accessJwt, {
      params: { uri },
    });
    if (!data.thread?.post) {
      throw new Error('Post not found');
    }
    return data.thread.post;
  }

  /**
   * Gets a post thread including replies
   * @param accessJwt - Valid access JWT token
   * @param uri - The post's URI
   * @returns Promise resolving to thread data
   */
  async getPostThread(accessJwt: string, uri: string): Promise<BlueskyThreadResponse> {
    return this.makeAuthenticatedRequest<BlueskyThreadResponse>('/app.bsky.feed.getPostThread', accessJwt, {
      params: { uri },
    });
  }

  /**
   * Gets posts from a specific author
   * @param accessJwt - Valid access JWT token
   * @param actor - The author's handle or DID
   * @param limit - Number of posts to fetch (default: 20)
   * @param cursor - Pagination cursor
   * @param filter - Filter type for posts (posts_with_replies, posts_no_replies, posts_with_media, posts_and_author_threads)
   * @returns Promise resolving to author feed data
   */
  async getAuthorFeed(
    accessJwt: string,
    actor: string,
    limit: number = 20,
    cursor?: string,
    filter?: 'posts_with_replies' | 'posts_no_replies' | 'posts_with_media' | 'posts_and_author_threads',
  ): Promise<BlueskyFeedResponse> {
    const params: Record<string, string> = {
      actor,
      limit: limit.toString(),
    };

    if (cursor) {
      params.cursor = cursor;
    }

    if (filter) {
      params.filter = filter;
    }

    return this.makeAuthenticatedRequest<BlueskyFeedResponse>('/app.bsky.feed.getAuthorFeed', accessJwt, { params });
  }

  /**
   * Gets posts from a specific author filtered by videos
   * @param accessJwt - Valid access JWT token
   * @param actor - The author's handle or DID
   * @param limit - Number of posts to fetch (default: 20)
   * @param cursor - Pagination cursor
   * @returns Promise resolving to author feed data filtered for videos
   */
  async getAuthorVideos(
    accessJwt: string,
    actor: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<BlueskyFeedResponse> {
    const params: Record<string, string> = {
      actor,
      limit: limit.toString(),
      filter: 'posts_with_video',
    };

    if (cursor) {
      params.cursor = cursor;
    }

    return this.makeAuthenticatedRequest<BlueskyFeedResponse>('/app.bsky.feed.getAuthorFeed', accessJwt, { params });
  }

  /**
   * Gets feeds created by a specific author
   * @param accessJwt - Valid access JWT token
   * @param actor - The author's handle or DID
   * @param limit - Number of feeds to fetch (default: 50)
   * @param cursor - Pagination cursor
   * @returns Promise resolving to feeds data
   */
  async getAuthorFeeds(
    accessJwt: string,
    actor: string,
    limit: number = 50,
    cursor?: string,
  ): Promise<BlueskyFeedsResponse> {
    const params: Record<string, string> = {
      actor,
      limit: limit.toString(),
    };

    if (cursor) {
      params.cursor = cursor;
    }

    return this.makeAuthenticatedRequest<BlueskyFeedsResponse>('/app.bsky.feed.getActorFeeds', accessJwt, { params });
  }

  /**
   * Gets starterpacks created by a specific author
   * @param accessJwt - Valid access JWT token
   * @param actor - The author's handle or DID
   * @param limit - Number of starterpacks to fetch (default: 50)
   * @param cursor - Pagination cursor
   * @returns Promise resolving to starterpacks data
   */
  async getAuthorStarterpacks(
    accessJwt: string,
    actor: string,
    limit: number = 50,
    cursor?: string,
  ): Promise<BlueskyStarterPacksResponse> {
    const params: Record<string, string> = {
      actor,
      limit: limit.toString(),
    };

    if (cursor) {
      params.cursor = cursor;
    }

    return this.makeAuthenticatedRequest<BlueskyStarterPacksResponse>('/app.bsky.graph.getActorStarterPacks', accessJwt, {
      params,
    });
  }

  /**
   * Likes a post
   * @param accessJwt - Valid access JWT token
   * @param postUri - The post's URI
   * @param postCid - The post's CID
   * @param userDid - The user's DID (required for repo field)
   * @returns Promise resolving to like operation result
   */
  async likePost(accessJwt: string, postUri: string, postCid: string, userDid: string): Promise<BlueskyLikeResponse> {
    return this.makeAuthenticatedRequest<BlueskyLikeResponse>('/com.atproto.repo.createRecord', accessJwt, {
      method: 'POST',
      body: {
        repo: userDid,
        collection: 'app.bsky.feed.like',
        record: {
          subject: {
            uri: postUri,
            cid: postCid,
          },
          createdAt: new Date().toISOString(),
          $type: 'app.bsky.feed.like',
        },
      },
    });
  }

  /**
   * Unlikes a post
   * @param accessJwt - Valid access JWT token
   * @param likeUri - The like record's URI to delete
   * @param userDid - The user's DID (required for repo field)
   * @returns Promise resolving to unlike operation result
   */
  async unlikePost(accessJwt: string, likeUri: string, userDid: string): Promise<BlueskyUnlikeResponse> {
    // Extract the rkey from the like URI
    // URI format: at://did:plc:xxx/app.bsky.feed.like/rkey
    const rkey = likeUri.split('/').pop();

    if (!rkey) {
      throw new Error('Invalid like URI: could not extract rkey');
    }

    return this.makeAuthenticatedRequest<BlueskyUnlikeResponse>('/com.atproto.repo.deleteRecord', accessJwt, {
      method: 'POST',
      body: {
        collection: 'app.bsky.feed.like',
        repo: userDid,
        rkey: rkey,
      },
    });
  }

  /**
   * Reposts a post
   */
  async repostPost(accessJwt: string, postUri: string, postCid: string, userDid: string): Promise<BlueskyLikeResponse> {
    return this.makeAuthenticatedRequest<BlueskyLikeResponse>('/com.atproto.repo.createRecord', accessJwt, {
      method: 'POST',
      body: {
        repo: userDid,
        collection: 'app.bsky.feed.repost',
        record: {
          subject: {
            uri: postUri,
            cid: postCid,
          },
          createdAt: new Date().toISOString(),
          $type: 'app.bsky.feed.repost',
        },
      },
    });
  }

  /**
   * Unreposts a post
   */
  async unrepostPost(accessJwt: string, repostUri: string, userDid: string): Promise<BlueskyUnlikeResponse> {
    const rkey = repostUri.split('/').pop();
    if (!rkey) throw new Error('Invalid repost URI: could not extract rkey');

    return this.makeAuthenticatedRequest<BlueskyUnlikeResponse>('/com.atproto.repo.deleteRecord', accessJwt, {
      method: 'POST',
      body: {
        collection: 'app.bsky.feed.repost',
        repo: userDid,
        rkey,
      },
    });
  }

  /**
   * Reports an account or post to moderation
   * @param labelerDid - Optional labeler service DID. When set, the report is
   *   routed to that labeler via the `atproto-proxy` header instead of the user's PDS.
   */
  async createReport(
    accessJwt: string,
    subject: { did: string } | { uri: string; cid: string },
    reasonType: string,
    reason?: string,
    labelerDid?: string,
  ) {
    const subjectPayload = 'did' in subject
      ? { $type: 'com.atproto.admin.defs#repoRef', did: subject.did }
      : { $type: 'com.atproto.repo.strongRef', uri: subject.uri, cid: subject.cid };

    return this.makeAuthenticatedRequest('/com.atproto.moderation.createReport', accessJwt, {
      method: 'POST',
      body: {
        reasonType: `com.atproto.moderation.defs#${reasonType}`,
        reason,
        subject: subjectPayload,
      },
      ...(labelerDid && {
        headers: { 'atproto-proxy': `${labelerDid}#atproto_labeler` },
      }),
    });
  }

  /**
   * Uploads an image or GIF and returns the blob reference
   * @param accessJwt - Valid access JWT token
   * @param imageUri - The local URI of the image or GIF
   * @param mimeType - The MIME type of the image or GIF
   * @returns Promise resolving to the uploaded blob reference
   */
  async uploadImage(
    accessJwt: string,
    imageUri: string,
    mimeType: string,
  ): Promise<BlueskyUploadBlobResponse> {
    // Convert image URI to blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Ensure proper MIME type for GIFs
    const finalMimeType = mimeType === 'image/gif' ? 'image/gif' : mimeType;

    return this.uploadBlob(accessJwt, blob, finalMimeType);
  }

  /**
   * Creates a new post
   * @param accessJwt - Valid access JWT token
   * @param userDid - The user's DID (required for repo field)
   * @param post - Post data including text, optional reply context, and optional images/GIFs
   * @returns Promise resolving to post creation result
   */
  async createPost(
    accessJwt: string,
    userDid: string,
    post: BlueskyCreatePostInput,
  ): Promise<BlueskyCreatePostResponse> {
    const { text, replyTo, images, quote } = post;

    let record: Record<string, unknown> = {
      text,
      createdAt: new Date().toISOString(),
      $type: 'app.bsky.feed.post',
      langs: ['en'],
    };

    // Add reply context if provided — resolve URIs to { uri, cid } objects
    if (replyTo) {
      const resolvePost = async (uri: string) => {
        const res = await this.makeAuthenticatedRequest<{ uri: string; cid: string; value: unknown }>(
          '/com.atproto.repo.getRecord',
          accessJwt,
          {
            params: {
              repo: uri.split('/')[2],
              collection: 'app.bsky.feed.post',
              rkey: uri.split('/').pop()!,
            },
          },
        );
        return { uri: res.uri, cid: res.cid };
      };

      const [root, parent] = await Promise.all([
        resolvePost(replyTo.root),
        replyTo.root === replyTo.parent ? resolvePost(replyTo.root) : resolvePost(replyTo.parent),
      ]);

      record.reply = { root, parent };
    }

    // Build the media embed (images or GIFs) first; we'll wrap it in
    // recordWithMedia below if a quote is also attached.
    let mediaEmbed: Record<string, unknown> | undefined;

    if (images && images.length > 0) {
      // Separate regular images from GIFs
      const regularImages = images.filter((img) => img.mimeType !== 'image/gif');
      const gifs = images.filter((img) => img.mimeType === 'image/gif');

      // Handle regular images as image embeds
      if (regularImages.length > 0) {
        const uploadedImages = await Promise.all(
          regularImages.map(async (image) => {
            const blobRef = await this.uploadImage(accessJwt, image.uri, image.mimeType);
            return {
              alt: image.alt,
              image: blobRef.blob,
            };
          }),
        );

        mediaEmbed = {
          $type: 'app.bsky.embed.images',
          images: uploadedImages,
        };
      }

      // Handle GIFs as external embeds
      if (gifs.length > 0) {
        // For now, we'll use the first GIF as the external embed
        // In the future, we could support multiple GIFs
        const gif = gifs[0];

        // Upload the GIF as a JPEG thumbnail (Bluesky requires JPEG, not GIF)
        const thumbnailBlob = await this.uploadImage(accessJwt, gif.uri, 'image/jpeg');

        mediaEmbed = {
          $type: 'app.bsky.embed.external',
          external: {
            uri: gif.uri,
            title: gif.alt || 'GIF',
            description: `Alt: ${gif.alt || 'GIF'}`,
            thumb: {
              $type: 'blob',
              ref: thumbnailBlob.blob.ref,
              mimeType: thumbnailBlob.blob.mimeType,
              size: thumbnailBlob.blob.size,
            },
          },
        };
      }
    }

    if (quote) {
      const recordEmbed = {
        $type: 'app.bsky.embed.record',
        record: { uri: quote.uri, cid: quote.cid },
      };

      record.embed = mediaEmbed
        ? {
            $type: 'app.bsky.embed.recordWithMedia',
            record: recordEmbed,
            media: mediaEmbed,
          }
        : recordEmbed;
    } else if (mediaEmbed) {
      record.embed = mediaEmbed;
    }

    return this.makeAuthenticatedRequest<BlueskyCreatePostResponse>('/com.atproto.repo.createRecord', accessJwt, {
      method: 'POST',
      body: {
        repo: userDid,
        collection: 'app.bsky.feed.post',
        record,
      },
    });
  }

  /**
   * Sets (or replaces) the threadgate record on a post — controls who can
   * reply to the thread. The threadgate record lives at the same rkey as
   * the post itself, so we look up the rkey from the post URI and
   * putRecord with that rkey.
   *
   * `allow` rules:
   *   - `undefined` → everyone can reply (no threadgate record needed; we
   *     still write one so the user can change their mind later via the same
   *     codepath, but with an empty `allow: []` array which means *nobody*).
   *     Pass an empty array explicitly to mean "nobody".
   *   - any combination of mention / following / follower / list rules.
   */
  async setThreadgate(
    accessJwt: string,
    userDid: string,
    postUri: string,
    allow:
      | { type: 'everyone' }
      | {
          type: 'limited';
          mention?: boolean;
          following?: boolean;
          follower?: boolean;
          listUris?: string[];
        }
      | { type: 'nobody' },
  ) {
    const rkey = postUri.split('/').pop();
    if (!rkey) throw new Error(`Invalid post URI: ${postUri}`);

    const record: Record<string, unknown> = {
      $type: 'app.bsky.feed.threadgate',
      post: postUri,
      createdAt: new Date().toISOString(),
    };

    if (allow.type === 'nobody') {
      record.allow = [];
    } else if (allow.type === 'limited') {
      const rules: Record<string, unknown>[] = [];
      if (allow.mention) rules.push({ $type: 'app.bsky.feed.threadgate#mentionRule' });
      if (allow.following) rules.push({ $type: 'app.bsky.feed.threadgate#followingRule' });
      if (allow.follower) rules.push({ $type: 'app.bsky.feed.threadgate#followerRule' });
      for (const list of allow.listUris ?? []) {
        rules.push({ $type: 'app.bsky.feed.threadgate#listRule', list });
      }
      record.allow = rules;
    }
    // type === 'everyone' → omit `allow` entirely so the lexicon treats it
    // as "all rules pass".

    return this.makeAuthenticatedRequest('/com.atproto.repo.putRecord', accessJwt, {
      method: 'POST',
      body: {
        repo: userDid,
        collection: 'app.bsky.feed.threadgate',
        rkey,
        record,
      },
    });
  }

  /**
   * Sets (or replaces) the postgate record on a post — controls quote
   * embedding. Lives at the same rkey as the post.
   */
  async setPostgate(
    accessJwt: string,
    userDid: string,
    postUri: string,
    options: { allowQuote: boolean },
  ) {
    const rkey = postUri.split('/').pop();
    if (!rkey) throw new Error(`Invalid post URI: ${postUri}`);

    const record: Record<string, unknown> = {
      $type: 'app.bsky.feed.postgate',
      post: postUri,
      createdAt: new Date().toISOString(),
      embeddingRules: options.allowQuote
        ? []
        : [{ $type: 'app.bsky.feed.postgate#disableRule' }],
    };

    return this.makeAuthenticatedRequest('/com.atproto.repo.putRecord', accessJwt, {
      method: 'POST',
      body: {
        repo: userDid,
        collection: 'app.bsky.feed.postgate',
        rkey,
        record,
      },
    });
  }
}
