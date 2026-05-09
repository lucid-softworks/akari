import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';

import type {
  BlueskyFeedItem,
  BlueskyFeedResponse,
  BlueskyPostView,
} from '@/bluesky-api';
import { useToast } from '@/contexts/ToastContext';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { useTranslation } from '@/hooks/useTranslation';
import { apiForAccount } from '@/utils/blueskyApi';

type FeedPagesQueryData = { pages: BlueskyFeedResponse[] };
type ThreadQueryData = { thread: { post: BlueskyPostView; replies?: any[] } };

type BookmarkPostInput = {
  postUri: string;
  postCid: string;
  action: 'bookmark' | 'unbookmark';
};

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
 * Mutation hook for bookmarking and unbookmarking posts.
 *
 * Optimistically updates `post.viewer.bookmarked` across every feed shape
 * the post may live in (timeline, feed, authorFeed, post, postThread) so
 * the bookmark icon flips immediately, and rolls back on error.
 */
export function useBookmarkPost() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const { showToast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ postUri, postCid, action }: BookmarkPostInput) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = apiForAccount(currentAccount);

      if (action === 'bookmark') {
        await api.createBookmark(token, postUri, postCid);
      } else {
        await api.deleteBookmark(token, postUri);
      }
    },
    onMutate: async ({ postUri, action }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.timeline.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.feed.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.author.feed.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.post.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.postThread.all });

      const timelineSnapshots = snapshotByPrefix<BlueskyFeedResponse>(queryClient, queryKeys.timeline.all);
      const feedSnapshots = snapshotByPrefix<FeedPagesQueryData>(queryClient, queryKeys.feed.all);
      const authorFeedSnapshots = snapshotByPrefix<FeedPagesQueryData>(queryClient, queryKeys.author.feed.all);
      const postSnapshots = snapshotByPrefix<BlueskyPostView>(queryClient, queryKeys.post.all);
      const postThreadSnapshots = snapshotByPrefix<ThreadQueryData>(queryClient, queryKeys.postThread.all);

      const updatePost = (post: BlueskyPostView): BlueskyPostView => ({
        ...post,
        viewer: { ...post.viewer, bookmarked: action === 'bookmark' },
      });

      const updateFeedItem = (item: BlueskyFeedItem): BlueskyFeedItem => ({
        ...item,
        post: item.post.uri === postUri ? updatePost(item.post) : item.post,
      });

      for (const [queryKey, data] of timelineSnapshots) {
        if (!data) continue;
        queryClient.setQueryData(queryKey, {
          ...data,
          feed: data.feed?.map((item) => updateFeedItem(item)),
        });
      }

      for (const [queryKey, data] of feedSnapshots) {
        if (!data || !Array.isArray(data.pages)) continue;
        queryClient.setQueryData(queryKey, {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            feed: page.feed.map((item) => updateFeedItem(item)),
          })),
        });
      }

      for (const [queryKey, data] of authorFeedSnapshots) {
        if (!data || !Array.isArray(data.pages)) continue;
        queryClient.setQueryData(queryKey, {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            feed: page.feed.map((item) => updateFeedItem(item)),
          })),
        });
      }

      for (const [queryKey, data] of postSnapshots) {
        if (!data || data.uri !== postUri) continue;
        queryClient.setQueryData(queryKey, updatePost(data));
      }

      for (const [queryKey, data] of postThreadSnapshots) {
        if (!data?.thread) continue;
        let updated = false;
        let newThread = data.thread;

        if (newThread.post?.uri === postUri) {
          newThread = { ...newThread, post: updatePost(newThread.post) };
          updated = true;
        }

        if (newThread.replies) {
          const updateReplies = (replies: any[]): any[] =>
            replies.map((reply: any) => {
              if (!reply?.post) return reply;
              const newReply =
                reply.post.uri === postUri ? { ...reply, post: updatePost(reply.post) } : reply;
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
        postSnapshots,
        postThreadSnapshots,
      };
    },
    onError: (_err, variables, context) => {
      restoreSnapshots(queryClient, context?.timelineSnapshots);
      restoreSnapshots(queryClient, context?.feedSnapshots);
      restoreSnapshots(queryClient, context?.authorFeedSnapshots);
      restoreSnapshots(queryClient, context?.postSnapshots);
      restoreSnapshots(queryClient, context?.postThreadSnapshots);

      showToast({
        type: 'error',
        message:
          variables.action === 'bookmark'
            ? t('post.bookmarkFailed')
            : t('post.unbookmarkFailed'),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks.all });
    },
  });
}
