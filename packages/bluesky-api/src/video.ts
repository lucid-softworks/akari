/**
 * Utility functions for handling Bluesky video URLs
 */

/**
 * Resolves a Bluesky HLS playlist URL to get the actual video URL with session ID
 * @param url The playlist URL from Bluesky
 * @returns The resolved video URL with session ID, or the original URL if not a Bluesky playlist
 */
export async function resolveBlueskyVideoUrl(url: string): Promise<string | undefined> {
  if (!url.includes('video.bsky.app') || !url.includes('playlist.m3u8')) {
    return url; // Not a Bluesky playlist, return as-is
  }

  try {
    // Add timeout and better error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000); // 10 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/vnd.apple.mpegurl,application/x-mpegurl,*/*',
        'User-Agent': 'VideoPlayer/1.0',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const playlist = await response.text();

    // Parse the playlist to get the video path (which includes session_id)
    const lines = playlist.split('\n');
    let videoPath = '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      // Look for lines that end with video.m3u8 and contain session_id (not comments)
      if (line.includes('video.m3u8') && line.includes('session_id=') && !line.startsWith('#')) {
        videoPath = line;
        break;
      }
    }

    if (videoPath) {
      // Construct the base URL from the original playlist URL
      const baseUrl = url.replace('/playlist.m3u8', '');
      // The videoPath already contains the session_id, so just combine base + path
      const resolvedUrl = `${baseUrl}/${videoPath}`;
      return resolvedUrl;
    }

    throw new Error('Could not parse playlist - no video path found');
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('Video resolution: Request timeout');
    } else {
      console.error('Video resolution: Failed to resolve playlist:', error);
    }
    return undefined; // Return undefined on error instead of original URL
  }
}
