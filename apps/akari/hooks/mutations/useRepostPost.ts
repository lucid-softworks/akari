import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import type {
  BlueskyFeedItem,
  BlueskyFeedResponse,
  BlueskyLikeResponse,
  BlueskyPostView,
  BlueskyUnlikeResponse,
} from '@/bluesky-api';
import { apiForAccount } from '@/utils/blueskyApi';
export function useRepostPost() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async ({
      postUri,
      postCid,
      repostUri,
      action,
    }: {
      postUri: string;
      postCid?: string;
      repostUri?: string;
      action: 'repost' | 'unrepost';
    }) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.did) throw new Error('No user DID available');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = apiForAccount(currentAccount);

      if (action === 'repost') {
        if (!postCid) throw new Error('Post CID is required for repost');
        return await api.repostPost(token, postUri, postCid, currentAccount.did);
      } else {
        if (!repostUri) throw new Error('Repost URI is required for unrepost');
        return await api.unrepostPost(token, repostUri, currentAccount.did);
      }
    },
    onMutate: async ({ postUri, action }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: queryKeys.timeline.all }),
        queryClient.cancelQueries({ queryKey: queryKeys.feed.all }),
        queryClient.cancelQueries({ queryKey: queryKeys.author.feed.all }),
        queryClient.cancelQueries({ queryKey: queryKeys.post.all }),
        queryClient.cancelQueries({ queryKey: queryKeys.postThread.all }),
      ]);

      const previousTimeline = queryClient.getQueryData<BlueskyFeedResponse>(queryKeys.timeline.all);

      const updatePostRepostStatus = (post: BlueskyPostView): BlueskyPostView => ({
        ...post,
        repostCount: action === 'repost' ? (post.repostCount || 0) + 1 : Math.max(0, (post.repostCount || 0) - 1),
        viewer: {
          ...post.viewer,
          repost: action === 'repost' ? `temp-repost-${postUri}` : undefined,
        },
      });

      // Patch the main post AND the inline `reply.parent` /
      // `reply.root` views so a repost on the parent we render above
      // a reply still flips its button optimistically. See the
      // matching comment in `useLikePost`.
      const updateFeedItem = (item: BlueskyFeedItem): BlueskyFeedItem => {
        const next: BlueskyFeedItem = { ...item };
        if (item.post.uri === postUri) {
          next.post = updatePostRepostStatus(item.post);
        }
        if (item.reply?.parent || item.reply?.root) {
          next.reply = { ...item.reply };
          if (item.reply.parent && item.reply.parent.uri === postUri) {
            next.reply.parent = updatePostRepostStatus(item.reply.parent);
          }
          if (item.reply.root && item.reply.root.uri === postUri) {
            next.reply.root = updatePostRepostStatus(item.reply.root);
          }
        }
        return next;
      };

      // Update timeline
      queryClient.setQueryData<BlueskyFeedResponse>(queryKeys.timeline.all, (old) => {
        if (!old) return old;
        return {
          ...old,
          feed: old.feed?.map((item) => updateFeedItem(item)),
        };
      });

      // Update all feed queries
      const feedQueries = queryClient.getQueriesData<{ pages: BlueskyFeedResponse[] }>({ queryKey: queryKeys.feed.all });
      for (const [queryKey, data] of feedQueries) {
        if (data && Array.isArray(data.pages)) {
          queryClient.setQueryData(queryKey, {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              feed: page.feed.map((item) => updateFeedItem(item)),
            })),
          });
        }
      }

      // Update all authorFeed queries
      const authorFeedQueries = queryClient.getQueriesData<{ pages: BlueskyFeedResponse[] }>({ queryKey: queryKeys.author.feed.all });
      for (const [queryKey, data] of authorFeedQueries) {
        if (data && Array.isArray(data.pages)) {
          queryClient.setQueryData(queryKey, {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              feed: page.feed.map((item) => updateFeedItem(item)),
            })),
          });
        }
      }

      // Update all individual post queries
      const postQueries = queryClient.getQueriesData<BlueskyPostView>({ queryKey: queryKeys.post.all });
      for (const [queryKey, data] of postQueries) {
        if (data && data.uri === postUri) {
          queryClient.setQueryData(queryKey, updatePostRepostStatus(data));
        }
      }

      // Update all post thread queries
      const threadQueries = queryClient.getQueriesData<{ thread: { post: BlueskyPostView } }>({ queryKey: queryKeys.postThread.all });
      for (const [queryKey, data] of threadQueries) {
        if (data?.thread?.post?.uri === postUri) {
          queryClient.setQueryData(queryKey, {
            ...data,
            thread: { ...data.thread, post: updatePostRepostStatus(data.thread.post) },
          });
        }
      }

      return { previousTimeline };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTimeline) {
        queryClient.setQueryData(queryKeys.timeline.all, context.previousTimeline);
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.author.feed.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.post.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.postThread.all });
    },
    onSuccess: (data: BlueskyLikeResponse | BlueskyUnlikeResponse, variables) => {
      if (variables.action === 'repost' && 'uri' in data) {
        const updateRepostUri = (post: BlueskyPostView): BlueskyPostView => ({
          ...post,
          viewer: { ...post.viewer, repost: data.uri },
        });

        const updateFeedItem = (item: BlueskyFeedItem): BlueskyFeedItem => {
          const next: BlueskyFeedItem = { ...item };
          if (item.post.uri === variables.postUri) {
            next.post = updateRepostUri(item.post);
          }
          if (item.reply?.parent || item.reply?.root) {
            next.reply = { ...item.reply };
            if (item.reply.parent && item.reply.parent.uri === variables.postUri) {
              next.reply.parent = updateRepostUri(item.reply.parent);
            }
            if (item.reply.root && item.reply.root.uri === variables.postUri) {
              next.reply.root = updateRepostUri(item.reply.root);
            }
          }
          return next;
        };

        queryClient.setQueryData<BlueskyFeedResponse>(queryKeys.timeline.all, (old) => {
          if (!old) return old;
          return {
            ...old,
            feed: old.feed?.map((item) => updateFeedItem(item)),
          };
        });

        const feedQueries = queryClient.getQueriesData<{ pages: BlueskyFeedResponse[] }>({ queryKey: queryKeys.feed.all });
        for (const [queryKey, feedData] of feedQueries) {
          if (feedData && Array.isArray(feedData.pages)) {
            queryClient.setQueryData(queryKey, {
              ...feedData,
              pages: feedData.pages.map((page) => ({
                ...page,
                feed: page.feed.map((item) => updateFeedItem(item)),
              })),
            });
          }
        }

        const postQueries = queryClient.getQueriesData<BlueskyPostView>({ queryKey: queryKeys.post.all });
        for (const [queryKey, postData] of postQueries) {
          if (postData && postData.uri === variables.postUri) {
            queryClient.setQueryData(queryKey, updateRepostUri(postData));
          }
        }

        const threadQueries = queryClient.getQueriesData<{ thread: { post: BlueskyPostView } }>({ queryKey: queryKeys.postThread.all });
        for (const [queryKey, threadData] of threadQueries) {
          if (threadData?.thread?.post?.uri === variables.postUri) {
            queryClient.setQueryData(queryKey, {
              ...threadData,
              thread: { ...threadData.thread, post: updateRepostUri(threadData.thread.post) },
            });
          }
        }
      }
    },
  });
}
