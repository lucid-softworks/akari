import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import type {
  BlueskyFeedItem,
  BlueskyFeedResponse,
  BlueskyLikeResponse,
  BlueskyPostView,
  BlueskyUnlikeResponse,
} from '@/bluesky-api';
import { BlueskyApi } from '@/bluesky-api';

/**
 * Mutation hook for liking and unliking posts
 */
export function useLikePost() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

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

      const api = new BlueskyApi(currentAccount.pdsUrl);

      if (action === 'like') {
        if (!postCid) throw new Error('Post CID is required for like');
        return await api.likePost(token, postUri, postCid, currentAccount.did);
      } else {
        if (!likeUri) throw new Error('Like URI is required for unlike');
        return await api.unlikePost(token, likeUri, currentAccount.did);
      }
    },
    onMutate: async ({ postUri, action }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['timeline'] });
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      await queryClient.cancelQueries({ queryKey: ['authorFeed'] });
      await queryClient.cancelQueries({ queryKey: ['authorLikes'] });
      await queryClient.cancelQueries({ queryKey: ['post'] });
      await queryClient.cancelQueries({ queryKey: ['postThread'] });

      // Snapshot the previous value
      const previousTimeline = queryClient.getQueryData<BlueskyFeedResponse>(['timeline']);
      const previousFeed = queryClient.getQueryData<{ pages: BlueskyFeedResponse[] }>(['feed']);
      const previousAuthorFeed = queryClient.getQueryData<{ pages: BlueskyFeedResponse[] }>(['authorFeed']);
      const previousAuthorLikes = queryClient.getQueryData<{ pages: BlueskyFeedResponse[] }>(['authorLikes']);
      // Helper function to update a post's like status
      const updatePostLikeStatus = (post: BlueskyPostView): BlueskyPostView => ({
        ...post,
        likeCount: action === 'like' ? (post.likeCount || 0) + 1 : Math.max(0, (post.likeCount || 0) - 1),
        viewer: {
          ...post.viewer,
          like: action === 'like' ? `temp-like-${postUri}` : undefined,
        },
      });

      // Helper function to update a feed item's post
      const updateFeedItemPost = (item: BlueskyFeedItem): BlueskyFeedItem => ({
        ...item,
        post: updatePostLikeStatus(item.post),
      });

      // Optimistically update the queries
      queryClient.setQueryData<BlueskyFeedResponse>(['timeline'], (old) => {
        if (!old) return old;
        return {
          ...old,
          feed: old.feed?.map((item) => (item.post.uri === postUri ? updateFeedItemPost(item) : item)),
        };
      });

      // Update all feed queries (they have the format ['feed', feedUri])
      const feedQueries = queryClient.getQueriesData<{ pages: BlueskyFeedResponse[] }>({ queryKey: ['feed'] });
      for (const [queryKey, data] of feedQueries) {
        if (data && Array.isArray(data.pages)) {
          queryClient.setQueryData(queryKey, {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              feed: page.feed.map((item) => (item.post.uri === postUri ? updateFeedItemPost(item) : item)),
            })),
          });
        }
      }

      // Update all authorFeed queries (they have the format ['authorFeed', identifier, limit])
      const authorFeedQueries = queryClient.getQueriesData<{ pages: BlueskyFeedResponse[] }>({ queryKey: ['authorFeed'] });
      for (const [queryKey, data] of authorFeedQueries) {
        if (data && Array.isArray(data.pages)) {
          queryClient.setQueryData(queryKey, {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              feed: page.feed.map((item) => (item.post.uri === postUri ? updateFeedItemPost(item) : item)),
            })),
          });
        }
      }

      // Update all authorLikes queries (they have the format ['authorLikes', identifier, limit])
      const authorLikesQueries = queryClient.getQueriesData<{ pages: BlueskyFeedResponse[] }>({ queryKey: ['authorLikes'] });
      for (const [queryKey, data] of authorLikesQueries) {
        if (data && Array.isArray(data.pages)) {
          queryClient.setQueryData(queryKey, {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              feed: page.feed.map((item) => (item.post.uri === postUri ? updateFeedItemPost(item) : item)),
            })),
          });
        }
      }

      // Update all individual post queries (keyed as ['post', { actor, rKey }, pdsUrl])
      const postQueries = queryClient.getQueriesData<BlueskyPostView>({ queryKey: ['post'] });
      for (const [queryKey, data] of postQueries) {
        if (data && data.uri === postUri) {
          queryClient.setQueryData(queryKey, updatePostLikeStatus(data));
        }
      }

      // Update all post thread queries
      const threadQueries = queryClient.getQueriesData<{ thread: { post: BlueskyPostView } }>({ queryKey: ['postThread'] });
      for (const [queryKey, data] of threadQueries) {
        if (data?.thread?.post?.uri === postUri) {
          queryClient.setQueryData(queryKey, {
            ...data,
            thread: {
              ...data.thread,
              post: updatePostLikeStatus(data.thread.post),
            },
          });
        }
      }

      // Return a context object with the snapshotted value
      return {
        previousTimeline,
        previousFeed,
        previousAuthorFeed,
        previousAuthorLikes,
      };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTimeline) {
        queryClient.setQueryData(['timeline'], context.previousTimeline);
      }
      if (context?.previousFeed) {
        queryClient.setQueryData(['feed'], context.previousFeed);
      }
      if (context?.previousAuthorFeed) {
        queryClient.setQueryData(['authorFeed'], context.previousAuthorFeed);
      }
      if (context?.previousAuthorLikes) {
        queryClient.setQueryData(['authorLikes'], context.previousAuthorLikes);
      }
      // Invalidate post queries to refetch correct state
      void queryClient.invalidateQueries({ queryKey: ['post'] });
      void queryClient.invalidateQueries({ queryKey: ['postThread'] });
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

        // Update timeline
        queryClient.setQueryData<BlueskyFeedResponse>(['timeline'], (old) => {
          if (!old) return old;
          return {
            ...old,
            feed: old.feed?.map((item) => (item.post.uri === variables.postUri ? updateFeedItemPost(item) : item)),
          };
        });

        // Update all feed queries (they have the format ['feed', feedUri])
        const feedQueries = queryClient.getQueriesData<{ pages: BlueskyFeedResponse[] }>({ queryKey: ['feed'] });
        for (const [queryKey, data] of feedQueries) {
          if (data && Array.isArray(data.pages)) {
            queryClient.setQueryData(queryKey, {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                feed: page.feed.map((item) => (item.post.uri === variables.postUri ? updateFeedItemPost(item) : item)),
              })),
            });
          }
        }

        // Update all authorFeed queries (they have the format ['authorFeed', identifier, limit])
        const authorFeedQueries = queryClient.getQueriesData<{ pages: BlueskyFeedResponse[] }>({ queryKey: ['authorFeed'] });
        for (const [queryKey, data] of authorFeedQueries) {
          if (data && Array.isArray(data.pages)) {
            queryClient.setQueryData(queryKey, {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                feed: page.feed.map((item) => (item.post.uri === variables.postUri ? updateFeedItemPost(item) : item)),
              })),
            });
          }
        }

        // Update all authorLikes queries (they have the format ['authorLikes', identifier, limit])
        const authorLikesQueries = queryClient.getQueriesData<{ pages: BlueskyFeedResponse[] }>({
          queryKey: ['authorLikes'],
        });
        for (const [queryKey, data] of authorLikesQueries) {
          if (data && Array.isArray(data.pages)) {
            queryClient.setQueryData(queryKey, {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                feed: page.feed.map((item) => (item.post.uri === variables.postUri ? updateFeedItemPost(item) : item)),
              })),
            });
          }
        }

        // Update all individual post queries
        const postQueries = queryClient.getQueriesData<BlueskyPostView>({ queryKey: ['post'] });
        for (const [queryKey, postData] of postQueries) {
          if (postData && postData.uri === variables.postUri) {
            queryClient.setQueryData(queryKey, updateLikeUri(postData));
          }
        }

        // Update all post thread queries
        const threadQueries = queryClient.getQueriesData<{ thread: { post: BlueskyPostView } }>({ queryKey: ['postThread'] });
        for (const [queryKey, threadData] of threadQueries) {
          if (threadData?.thread?.post?.uri === variables.postUri) {
            queryClient.setQueryData(queryKey, {
              ...threadData,
              thread: {
                ...threadData.thread,
                post: updateLikeUri(threadData.thread.post),
              },
            });
          }
        }
      }
    },
  });
}
