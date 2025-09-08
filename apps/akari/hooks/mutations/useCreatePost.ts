import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { BlueskyApi } from '@/bluesky-api';

/**
 * Mutation hook for creating posts
 */
export function useCreatePost() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationKey: ['createPost'],
    mutationFn: async ({
      text,
      replyTo,
      images,
    }: {
      /** The post text content */
      text: string;
      /** Optional reply context */
      replyTo?: {
        root: string;
        parent: string;
      };
      /** Optional array of images to attach */
      images?: {
        uri: string;
        alt: string;
        mimeType: string;
      }[];
    }) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.did) throw new Error('No user DID available');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = new BlueskyApi(currentAccount.pdsUrl);
      return await api.createPost(token, currentAccount.did, {
        text,
        replyTo,
        images,
      });
    },
    onMutate: async ({ text, replyTo, images }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['timeline'] });
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      await queryClient.cancelQueries({ queryKey: ['authorFeed', currentAccount?.did] });
      await queryClient.cancelQueries({ queryKey: ['authorPosts', currentAccount?.did] });

      // Snapshot the previous values
      const previousTimeline = queryClient.getQueryData(['timeline']);
      const previousFeed = queryClient.getQueryData(['feed']);
      const previousAuthorFeed = queryClient.getQueryData(['authorFeed', currentAccount?.did]);
      const previousAuthorPosts = queryClient.getQueryData(['authorPosts', currentAccount?.did]);

      // Create optimistic post data
      const optimisticPost = {
        uri: `temp-${Date.now()}`, // Temporary URI for optimistic update
        cid: `temp-cid-${Date.now()}`, // Temporary CID
        record: {
          text,
          createdAt: new Date().toISOString(),
          reply: replyTo
            ? {
                root: { uri: replyTo.root, cid: 'temp' },
                parent: { uri: replyTo.parent, cid: 'temp' },
              }
            : undefined,
          embed:
            images && images.length > 0
              ? {
                  $type: 'app.bsky.embed.images',
                  images: images.map((img, index) => ({
                    alt: img.alt,
                    image: {
                      ref: { $link: `temp-image-${index}` },
                      mimeType: img.mimeType,
                      size: 0,
                    },
                    thumb: img.uri,
                    fullsize: img.uri,
                  })),
                }
              : undefined,
        },
        author: {
          handle: currentAccount?.handle || '',
          displayName: currentAccount?.displayName || '',
          avatar: currentAccount?.avatar || '',
        },
        indexedAt: new Date().toISOString(),
        likeCount: 0,
        replyCount: 0,
        repostCount: 0,
        viewer: {},
        embed:
          images && images.length > 0
            ? {
                $type: 'app.bsky.embed.images#view',
                images: images.map((img, index) => ({
                  alt: img.alt,
                  image: {
                    ref: { $link: `temp-image-${index}` },
                    mimeType: img.mimeType,
                    size: 0,
                  },
                  thumb: img.uri,
                  fullsize: img.uri,
                })),
              }
            : undefined,
        embeds: [],
        labels: [],
      };

      // Optimistically update timeline
      if (previousTimeline) {
        queryClient.setQueryData(['timeline'], (old: any) => {
          if (!old?.pages?.[0]?.feed) return old;
          return {
            ...old,
            pages: [
              {
                ...old.pages[0],
                feed: [optimisticPost, ...old.pages[0].feed],
              },
              ...old.pages.slice(1),
            ],
          };
        });
      }

      // Optimistically update feed
      if (previousFeed) {
        queryClient.setQueryData(['feed'], (old: any) => {
          if (!old?.pages?.[0]?.feed) return old;
          return {
            ...old,
            pages: [
              {
                ...old.pages[0],
                feed: [optimisticPost, ...old.pages[0].feed],
              },
              ...old.pages.slice(1),
            ],
          };
        });
      }

      // Optimistically update author feed
      if (previousAuthorFeed) {
        queryClient.setQueryData(['authorFeed', currentAccount?.did], (old: any) => {
          if (!old?.pages?.[0]?.feed) return old;
          return {
            ...old,
            pages: [
              {
                ...old.pages[0],
                feed: [optimisticPost, ...old.pages[0].feed],
              },
              ...old.pages.slice(1),
            ],
          };
        });
      }

      // Optimistically update author posts
      if (previousAuthorPosts) {
        queryClient.setQueryData(['authorPosts', currentAccount?.did], (old: any) => {
          if (!old?.pages?.[0]?.feed) return old;
          return {
            ...old,
            pages: [
              {
                ...old.pages[0],
                feed: [optimisticPost, ...old.pages[0].feed],
              },
              ...old.pages.slice(1),
            ],
          };
        });
      }

      // Return context with the snapshotted values
      return {
        previousTimeline,
        previousFeed,
        previousAuthorFeed,
        previousAuthorPosts,
        optimisticPost,
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
        queryClient.setQueryData(['authorFeed', currentAccount?.did], context.previousAuthorFeed);
      }
      if (context?.previousAuthorPosts) {
        queryClient.setQueryData(['authorPosts', currentAccount?.did], context.previousAuthorPosts);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['authorFeed', currentAccount?.did] });
      queryClient.invalidateQueries({ queryKey: ['authorPosts', currentAccount?.did] });
    },
  });
}
