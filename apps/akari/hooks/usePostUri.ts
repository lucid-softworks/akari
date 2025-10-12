/**
 * Hook to get a post URI from either a full URI or a handle + record key combination
 */
export function usePostUri(postId: string, handle?: string) {
  // If it's already a full URI, return it as is
  if (postId.startsWith('at://')) {
    return postId;
  }

  // If we have a handle, construct the URI using the handle directly
  if (handle) {
    // Use the handle directly: at://{handle}/app.bsky.feed.post/{recordKey}
    const fullUri = `at://${handle}/app.bsky.feed.post/${postId}`;
    console.log(`Reconstructed URI: ${fullUri} from handle: ${handle}, recordKey: ${postId}`);
    return fullUri;
  }

  // If we don't have a handle, return the original postId
  // This might cause issues, but it's better than crashing
  console.warn(`No handle provided for postId: ${postId}`);
  return postId;
}
