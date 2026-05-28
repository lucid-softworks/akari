import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';
import { detectFacets } from '@/utils/textFacets';
/**
 * Mutation hook for creating posts
 */
type CreatePostParams = {
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
  /** Optional video. Mutually exclusive with `images` per lexicon.
   *  Pass the already-transcoded blob ref produced by the
   *  app.bsky.video.uploadVideo pipeline; createPost no longer
   *  uploads the file itself. */
  video?: {
    blob: { $type: 'blob'; ref: { $link: string }; mimeType: string; size: number };
    alt?: string;
    aspectRatio?: { width: number; height: number };
  };
  /** Optional quoted post (URI/CID) */
  quote?: { uri: string; cid: string };
  /** Optional `app.bsky.embed.external` link card (e.g. an attached poll).
   *  Mutually exclusive with images/video/quote. */
  externalEmbed?: { uri: string; title: string; description: string };
  /** BCP-47 language tags the post is written in. Defaults to ['en'] when
   *  the array is empty / omitted. */
  langs?: string[];
};

export function useCreatePost() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationKey: ['createPost'],
    mutationFn: async ({ text, replyTo, images, video, quote, externalEmbed, langs }: CreatePostParams) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.did) throw new Error('No user DID available');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = apiForAccount(currentAccount);
      // Detect links / mentions / hashtags so they ride along as facets;
      // without them clients render the post body as inert plain text.
      // Mention DIDs are resolved in parallel; failures are dropped so a
      // typo'd handle doesn't poison the whole post.
      const facets = await detectFacets(text);
      return await api.createPost(token, currentAccount.did, {
        text,
        replyTo,
        images,
        video,
        quote,
        externalEmbed,
        langs,
        facets: facets.length > 0 ? facets : undefined,
      });
    },
    onMutate: async ({ text, replyTo, images }) => {
      // Cancel any outgoing refetches
      await Promise.all([
        queryClient.cancelQueries({ queryKey: queryKeys.timeline.all }),
        queryClient.cancelQueries({ queryKey: queryKeys.feed.all }),
        queryClient.cancelQueries({ queryKey: queryKeys.author.feed.forDid(currentAccount?.did) }),
        queryClient.cancelQueries({ queryKey: queryKeys.author.posts.forDid(currentAccount?.did) }),
      ]);

      // Snapshot the previous values
      const previousTimeline = queryClient.getQueryData(queryKeys.timeline.all);
      const previousFeed = queryClient.getQueryData(queryKeys.feed.all);
      const previousAuthorFeed = queryClient.getQueryData(queryKeys.author.feed.forDid(currentAccount?.did));
      const previousAuthorPosts = queryClient.getQueryData(queryKeys.author.posts.forDid(currentAccount?.did));

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
        queryClient.setQueryData(queryKeys.timeline.all, (old: any) => {
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
        queryClient.setQueryData(queryKeys.feed.all, (old: any) => {
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
        queryClient.setQueryData(queryKeys.author.feed.forDid(currentAccount?.did), (old: any) => {
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
        queryClient.setQueryData(queryKeys.author.posts.forDid(currentAccount?.did), (old: any) => {
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
        queryClient.setQueryData(queryKeys.timeline.all, context.previousTimeline);
      }
      if (context?.previousFeed) {
        queryClient.setQueryData(queryKeys.feed.all, context.previousFeed);
      }
      if (context?.previousAuthorFeed) {
        queryClient.setQueryData(queryKeys.author.feed.forDid(currentAccount?.did), context.previousAuthorFeed);
      }
      if (context?.previousAuthorPosts) {
        queryClient.setQueryData(queryKeys.author.posts.forDid(currentAccount?.did), context.previousAuthorPosts);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure data consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.author.feed.forDid(currentAccount?.did) });
      queryClient.invalidateQueries({ queryKey: queryKeys.author.posts.forDid(currentAccount?.did) });
    },
  });
}
