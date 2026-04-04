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

      const api = new BlueskyApi(currentAccount.pdsUrl);

      if (action === 'repost') {
        if (!postCid) throw new Error('Post CID is required for repost');
        return await api.repostPost(token, postUri, postCid, currentAccount.did);
      } else {
        if (!repostUri) throw new Error('Repost URI is required for unrepost');
        return await api.unrepostPost(token, repostUri, currentAccount.did);
      }
    },
    onMutate: async ({ postUri, action }) => {
      await queryClient.cancelQueries({ queryKey: ['timeline'] });
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      await queryClient.cancelQueries({ queryKey: ['authorFeed'] });
      await queryClient.cancelQueries({ queryKey: ['post'] });
      await queryClient.cancelQueries({ queryKey: ['postThread'] });

      const previousTimeline = queryClient.getQueryData<BlueskyFeedResponse>(['timeline']);

      const updatePostRepostStatus = (post: BlueskyPostView): BlueskyPostView => ({
        ...post,
        repostCount: action === 'repost' ? (post.repostCount || 0) + 1 : Math.max(0, (post.repostCount || 0) - 1),
        viewer: {
          ...post.viewer,
          repost: action === 'repost' ? `temp-repost-${postUri}` : undefined,
        },
      });

      const updateFeedItem = (item: BlueskyFeedItem): BlueskyFeedItem => ({
        ...item,
        post: updatePostRepostStatus(item.post),
      });

      // Update timeline
      queryClient.setQueryData<BlueskyFeedResponse>(['timeline'], (old) => {
        if (!old) return old;
        return {
          ...old,
          feed: old.feed?.map((item) => (item.post.uri === postUri ? updateFeedItem(item) : item)),
        };
      });

      // Update all feed queries
      const feedQueries = queryClient.getQueriesData<{ pages: BlueskyFeedResponse[] }>({ queryKey: ['feed'] });
      for (const [queryKey, data] of feedQueries) {
        if (data && Array.isArray(data.pages)) {
          queryClient.setQueryData(queryKey, {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              feed: page.feed.map((item) => (item.post.uri === postUri ? updateFeedItem(item) : item)),
            })),
          });
        }
      }

      // Update all authorFeed queries
      const authorFeedQueries = queryClient.getQueriesData<{ pages: BlueskyFeedResponse[] }>({ queryKey: ['authorFeed'] });
      for (const [queryKey, data] of authorFeedQueries) {
        if (data && Array.isArray(data.pages)) {
          queryClient.setQueryData(queryKey, {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              feed: page.feed.map((item) => (item.post.uri === postUri ? updateFeedItem(item) : item)),
            })),
          });
        }
      }

      // Update all individual post queries
      const postQueries = queryClient.getQueriesData<BlueskyPostView>({ queryKey: ['post'] });
      for (const [queryKey, data] of postQueries) {
        if (data && data.uri === postUri) {
          queryClient.setQueryData(queryKey, updatePostRepostStatus(data));
        }
      }

      // Update all post thread queries
      const threadQueries = queryClient.getQueriesData<{ thread: { post: BlueskyPostView } }>({ queryKey: ['postThread'] });
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
        queryClient.setQueryData(['timeline'], context.previousTimeline);
      }
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void queryClient.invalidateQueries({ queryKey: ['authorFeed'] });
      void queryClient.invalidateQueries({ queryKey: ['post'] });
      void queryClient.invalidateQueries({ queryKey: ['postThread'] });
    },
    onSuccess: (data: BlueskyLikeResponse | BlueskyUnlikeResponse, variables) => {
      if (variables.action === 'repost' && 'uri' in data) {
        const updateRepostUri = (post: BlueskyPostView): BlueskyPostView => ({
          ...post,
          viewer: { ...post.viewer, repost: data.uri },
        });

        const updateFeedItem = (item: BlueskyFeedItem): BlueskyFeedItem => ({
          ...item,
          post: updateRepostUri(item.post),
        });

        queryClient.setQueryData<BlueskyFeedResponse>(['timeline'], (old) => {
          if (!old) return old;
          return {
            ...old,
            feed: old.feed?.map((item) => (item.post.uri === variables.postUri ? updateFeedItem(item) : item)),
          };
        });

        const feedQueries = queryClient.getQueriesData<{ pages: BlueskyFeedResponse[] }>({ queryKey: ['feed'] });
        for (const [queryKey, feedData] of feedQueries) {
          if (feedData && Array.isArray(feedData.pages)) {
            queryClient.setQueryData(queryKey, {
              ...feedData,
              pages: feedData.pages.map((page) => ({
                ...page,
                feed: page.feed.map((item) => (item.post.uri === variables.postUri ? updateFeedItem(item) : item)),
              })),
            });
          }
        }

        const postQueries = queryClient.getQueriesData<BlueskyPostView>({ queryKey: ['post'] });
        for (const [queryKey, postData] of postQueries) {
          if (postData && postData.uri === variables.postUri) {
            queryClient.setQueryData(queryKey, updateRepostUri(postData));
          }
        }

        const threadQueries = queryClient.getQueriesData<{ thread: { post: BlueskyPostView } }>({ queryKey: ['postThread'] });
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
