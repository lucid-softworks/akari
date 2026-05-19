import { PostCard } from '@/components/PostCard';
import { useTranslation } from '@/hooks/useTranslation';
import { useNavigateToPost } from '@/utils/navigation';
import { formatRelativeTime } from '@/utils/timeUtils';

export type SearchPostResultProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post: any;
};

/**
 * Renders a single post result row in the search list. Wraps PostCard
 * with the navigation + reply-context shape the search API returns.
 */
export function SearchPostResult({ post }: SearchPostResultProps) {
  const { t } = useTranslation();
  const navigateToPost = useNavigateToPost();

  // Check if this post is a reply and has reply context
  const replyTo = post.reply?.parent
    ? {
        author: {
          handle: post.reply.parent.author?.handle || t('common.unknown'),
          displayName: post.reply.parent.author?.displayName,
        },
        text: post.reply.parent.record?.text,
      }
    : undefined;

  return (
    <PostCard
      post={{
        id: post.uri,
        text: post.record?.text,
        author: {
          did: post.author.did,
          handle: post.author.handle,
          displayName: post.author.displayName,
          avatar: post.author.avatar,
          verification: post.author.verification,
          labels: post.author.labels,
        },
        createdAt: formatRelativeTime(post.indexedAt),
        likeCount: post.likeCount || 0,
        commentCount: post.replyCount || 0,
        repostCount: post.repostCount || 0,
        embed: post.embed,
        embeds: post.embeds,
        labels: post.labels,
        viewer: post.viewer,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        facets: (post.record as any)?.facets,
        replyTo,
        uri: post.uri,
        cid: post.cid,
        threadRootUri: (post.record as { reply?: { root?: { uri?: string } } }).reply?.root?.uri,
      }}
      href={`/profile/${post.author.handle}/post/${post.uri.split('/').pop()}`}
      onPress={() => {
        const uriParts = post.uri.split('/');
        const rKey = uriParts[uriParts.length - 1];
        navigateToPost({ actor: post.author.handle, rKey });
      }}
    />
  );
}
