/**
 * Utility functions for handling post URIs and record keys
 */

/**
 * Extract the record key (last segment) from an AT URI
 */
export function extractRecordKey(uri: string): string {
  // If it's already just a record key (no at:// prefix), return as is
  if (!uri.startsWith('at://')) {
    return uri;
  }

  // Extract the last segment after the final slash
  const segments = uri.split('/');
  return segments[segments.length - 1];
}

/**
 * Reconstruct a full AT URI from a handle and record key
 * This requires looking up the DID for the handle
 */
export function reconstructUriFromHandleAndRecordKey(handle: string, recordKey: string): string {
  // For now, we'll need to look up the DID from the handle
  // This is a placeholder - in practice, you'd need to call the profile lookup API
  // to get the DID for the handle, then construct: at://{did}/app.bsky.feed.post/{recordKey}

  // This is a temporary solution - we should implement proper DID lookup
  throw new Error(`Cannot reconstruct URI from handle ${handle} and record key ${recordKey} without DID lookup`);
}

/**
 * Check if a string is a full AT URI or just a record key
 */
export function isFullUri(uri: string): boolean {
  return uri.startsWith('at://');
}
