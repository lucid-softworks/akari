import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';

import { useToast } from '@/contexts/ToastContext';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { useTranslation } from '@/hooks/useTranslation';
import type {
  BlueskyFeedItem,
  BlueskyFeedResponse,
  BlueskyLikeResponse,
  BlueskyPostView,
  BlueskyUnlikeResponse,
} from '@/bluesky-api';
import { apiForAccount } from '@/utils/blueskyApi';
type FeedPagesQueryData = { pages: BlueskyFeedResponse[] };
type LikesPagesQueryData = { pages: { likes?: BlueskyPostView[]; cursor?: string }[] };
type ThreadQueryData = { thread: { post: BlueskyPostView; replies?: any[] } };

/**
 * Snapshot the data of every query whose key starts with `prefix` so we can
 * restore them in `onError`. React Query's `getQueriesData` is prefix-matched
 * out of the box; the typed wrapper just narrows the value type.
 */
function snapshotByPrefix<T>(
  queryClient: ReturnType<typeof useQueryClient>,
  prefix: QueryKey,
): [QueryKey, T | undefined][] {
  return queryClient.getQueriesData<T>({ queryKey: prefix }) as [QueryKey, T | undefined][];
}

function restoreSnapshots<T>(
  queryClient: ReturnType<typeof useQueryClient>,
  snapshots: [QueryKey, T | undefined][] | undefined,
) {
  if (!snapshots) return;
  for (const [queryKey, data] of snapshots) {
    queryClient.setQueryData(queryKey, data);
  }
}

/**
 * Mutation hook for liking and unliking posts
 */
export function useLikePost() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const { showToast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      postUri,
      postCid,
      likeUri,
      action,
    }: {
      /** The post's URI */
      postUri: string;
      /** The post's CID (required for like) */
      postCid?: string;
      /** The like record's URI (required for unlike) */
      likeUri?: string;
      /** Whether to like or unlike */
      action: 'like' | 'unlike';
    }) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.did) throw new Error('No user DID available');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = apiForAccount(currentAccount);

      if (action === 'like') {
        if (!postCid) throw new Error('Post CID is required for like');
        return await api.likePost(token, postUri, postCid, currentAccount.did);
      } else {
        if (!likeUri) throw new Error('Like URI is required for unlike');
        return await api.unlikePost(token, likeUri, currentAccount.did);
      }
    },
    onMutate: async ({ postUri, action }) => {
      // Cancel any outgoing refetches across all the prefixes we'll touch.
      await queryClient.cancelQueries({ queryKey: queryKeys.timeline.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.feed.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.author.feed.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.author.likes.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.post.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.postThread.all });

      // Snapshot every matching query (prefix-matched) so onError can roll
      // each one back. The previous implementation snapshotted by exact key
      // (`['timeline']`, etc.), which never matched the real cached keys
      // (`['timeline', limit, did]`, `['feed', feedUri]`, …) and so silently
      // no-op'd on rollback — leaving optimistic likes pinned to the UI even
      // when the create-record call failed.
      const timelineSnapshots = snapshotByPrefix<BlueskyFeedResponse>(queryClient, queryKeys.timeline.all);
      const feedSnapshots = snapshotByPrefix<FeedPagesQueryData>(queryClient, queryKeys.feed.all);
      const authorFeedSnapshots = snapshotByPrefix<FeedPagesQueryData>(queryClient, queryKeys.author.feed.all);
      const authorLikesSnapshots = snapshotByPrefix<LikesPagesQueryData>(queryClient, queryKeys.author.likes.all);
      const postSnapshots = snapshotByPrefix<BlueskyPostView>(queryClient, queryKeys.post.all);
      const postThreadSnapshots = snapshotByPrefix<ThreadQueryData>(queryClient, queryKeys.postThread.all);

      const updatePostLikeStatus = (post: BlueskyPostView): BlueskyPostView => ({
        ...post,
        likeCount: action === 'like' ? (post.likeCount || 0) + 1 : Math.max(0, (post.likeCount || 0) - 1),
        viewer: {
          ...post.viewer,
          like: action === 'like' ? `temp-like-${postUri}` : undefined,
        },
      });

      const updateFeedItemPost = (item: BlueskyFeedItem): BlueskyFeedItem => ({
        ...item,
        post: item.post.uri === postUri ? updatePostLikeStatus(item.post) : item.post,
      });

      // Apply optimistic updates by walking the snapshots we just took. Going
      // through `setQueryData` per-key keeps every cache in lockstep with
      // what we'll restore on error.
      for (const [queryKey, data] of timelineSnapshots) {
        if (!data) continue;
        queryClient.setQueryData(queryKey, {
          ...data,
          feed: data.feed?.map((item) =>
            item.post.uri === postUri ? updateFeedItemPost(item) : item,
          ),
        });
      }

      for (const [queryKey, data] of feedSnapshots) {
        if (!data || !Array.isArray(data.pages)) continue;
        queryClient.setQueryData(queryKey, {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            feed: page.feed.map((item) => updateFeedItemPost(item)),
          })),
        });
      }

      for (const [queryKey, data] of authorFeedSnapshots) {
        if (!data || !Array.isArray(data.pages)) continue;
        queryClient.setQueryData(queryKey, {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            feed: page.feed.map((item) => updateFeedItemPost(item)),
          })),
        });
      }

      // useAuthorLikes pages have shape `{ likes: BlueskyPostView[], cursor }`
      // — bare posts, not the `{ feed: BlueskyFeedItem[] }` envelope the
      // other feed queries use. Iterate `likes` directly and skip pages
      // that don't conform.
      for (const [queryKey, data] of authorLikesSnapshots) {
        if (!data || !Array.isArray(data.pages)) continue;
        queryClient.setQueryData(queryKey, {
          ...data,
          pages: data.pages.map((page) => {
            if (!Array.isArray(page.likes)) return page;
            return {
              ...page,
              likes: page.likes.map((post) =>
                post.uri === postUri ? updatePostLikeStatus(post) : post,
              ),
            };
          }),
        });
      }

      for (const [queryKey, data] of postSnapshots) {
        if (!data || data.uri !== postUri) continue;
        queryClient.setQueryData(queryKey, updatePostLikeStatus(data));
      }

      for (const [queryKey, data] of postThreadSnapshots) {
        if (!data?.thread) continue;
        let updated = false;
        let newThread = data.thread;

        if (newThread.post?.uri === postUri) {
          newThread = { ...newThread, post: updatePostLikeStatus(newThread.post) };
          updated = true;
        }

        if (newThread.replies) {
          const updateReplies = (replies: any[]): any[] =>
            replies.map((reply: any) => {
              if (!reply?.post) return reply;
              const newReply =
                reply.post.uri === postUri ? { ...reply, post: updatePostLikeStatus(reply.post) } : reply;
              if (newReply.replies) {
                return { ...newReply, replies: updateReplies(newReply.replies) };
              }
              return newReply;
            });
          const newReplies = updateReplies(newThread.replies);
          if (JSON.stringify(newReplies) !== JSON.stringify(newThread.replies)) {
            newThread = { ...newThread, replies: newReplies };
            updated = true;
          }
        }

        if (updated) {
          queryClient.setQueryData(queryKey, { ...data, thread: newThread });
        }
      }

      return {
        timelineSnapshots,
        feedSnapshots,
        authorFeedSnapshots,
        authorLikesSnapshots,
        postSnapshots,
        postThreadSnapshots,
      };
    },
    onError: (_err, variables, context) => {
      // Roll back every snapshotted cache entry so the optimistic heart
      // disappears when the network call fails.
      restoreSnapshots(queryClient, context?.timelineSnapshots);
      restoreSnapshots(queryClient, context?.feedSnapshots);
      restoreSnapshots(queryClient, context?.authorFeedSnapshots);
      restoreSnapshots(queryClient, context?.authorLikesSnapshots);
      restoreSnapshots(queryClient, context?.postSnapshots);
      restoreSnapshots(queryClient, context?.postThreadSnapshots);

      showToast({
        type: 'error',
        message:
          variables.action === 'like'
            ? t('post.likeFailed')
            : t('post.unlikeFailed'),
      });
    },
    onSuccess: (data: BlueskyLikeResponse | BlueskyUnlikeResponse, variables) => {
      // Update the temporary like URI with the real one from the server response
      if (variables.action === 'like' && 'uri' in data) {
        const updateLikeUri = (post: BlueskyPostView): BlueskyPostView => ({
          ...post,
          viewer: {
            ...post.viewer,
            like: data.uri,
          },
        });

        const updateFeedItemPost = (item: BlueskyFeedItem): BlueskyFeedItem => ({
          ...item,
          post: updateLikeUri(item.post),
        });

        // Update timeline (prefix-matched).
        const timelineQueries = queryClient.getQueriesData<BlueskyFeedResponse>({ queryKey: queryKeys.timeline.all });
        for (const [queryKey, timelineData] of timelineQueries) {
          if (!timelineData) continue;
          queryClient.setQueryData(queryKey, {
            ...timelineData,
            feed: timelineData.feed?.map((item) =>
              item.post.uri === variables.postUri ? updateFeedItemPost(item) : item,
            ),
          });
        }

        // Update all feed queries (they have the format ['feed', feedUri])
        const feedQueries = queryClient.getQueriesData<{ pages: BlueskyFeedResponse[] }>({ queryKey: queryKeys.feed.all });
        for (const [queryKey, feedData] of feedQueries) {
          if (feedData && Array.isArray(feedData.pages)) {
            queryClient.setQueryData(queryKey, {
              ...feedData,
              pages: feedData.pages.map((page) => ({
                ...page,
                feed: page.feed.map((item) => (item.post.uri === variables.postUri ? updateFeedItemPost(item) : item)),
              })),
            });
          }
        }

        // Update all authorFeed queries (they have the format ['authorFeed', identifier, limit])
        const authorFeedQueries = queryClient.getQueriesData<{ pages: BlueskyFeedResponse[] }>({ queryKey: queryKeys.author.feed.all });
        for (const [queryKey, authorFeedData] of authorFeedQueries) {
          if (authorFeedData && Array.isArray(authorFeedData.pages)) {
            queryClient.setQueryData(queryKey, {
              ...authorFeedData,
              pages: authorFeedData.pages.map((page) => ({
                ...page,
                feed: page.feed.map((item) => (item.post.uri === variables.postUri ? updateFeedItemPost(item) : item)),
              })),
            });
          }
        }

        // Update all authorLikes queries — pages here are
        // `{ likes: BlueskyPostView[] }`, not `{ feed: BlueskyFeedItem[] }`.
        const authorLikesQueries = queryClient.getQueriesData<LikesPagesQueryData>({
          queryKey: queryKeys.author.likes.all,
        });
        for (const [queryKey, likesData] of authorLikesQueries) {
          if (!likesData || !Array.isArray(likesData.pages)) continue;
          queryClient.setQueryData(queryKey, {
            ...likesData,
            pages: likesData.pages.map((page) => {
              if (!Array.isArray(page.likes)) return page;
              return {
                ...page,
                likes: page.likes.map((post) =>
                  post.uri === variables.postUri ? updateLikeUri(post) : post,
                ),
              };
            }),
          });
        }

        // Update all individual post queries
        const postQueries = queryClient.getQueriesData<BlueskyPostView>({ queryKey: queryKeys.post.all });
        for (const [queryKey, postData] of postQueries) {
          if (postData && postData.uri === variables.postUri) {
            queryClient.setQueryData(queryKey, updateLikeUri(postData));
          }
        }

        // Update all post thread queries (main post + replies)
        const threadQueries = queryClient.getQueriesData<{ thread: { post: BlueskyPostView; replies?: any[] } }>({ queryKey: queryKeys.postThread.all });
        for (const [queryKey, threadData] of threadQueries) {
          if (!threadData?.thread) continue;

          let updated = false;
          let newThread = threadData.thread;

          if (newThread.post?.uri === variables.postUri) {
            newThread = { ...newThread, post: updateLikeUri(newThread.post) };
            updated = true;
          }

          if (newThread.replies) {
            const updateReplies = (replies: any[]): any[] =>
              replies.map((reply: any) => {
                if (!reply?.post) return reply;
                const newReply = reply.post.uri === variables.postUri
                  ? { ...reply, post: updateLikeUri(reply.post) }
                  : reply;
                if (newReply.replies) {
                  return { ...newReply, replies: updateReplies(newReply.replies) };
                }
                return newReply;
              });

            const newReplies = updateReplies(newThread.replies);
            if (JSON.stringify(newReplies) !== JSON.stringify(newThread.replies)) {
              newThread = { ...newThread, replies: newReplies };
              updated = true;
            }
          }

          if (updated) {
            queryClient.setQueryData(queryKey, { ...threadData, thread: newThread });
          }
        }
      }
    },
  });
}
