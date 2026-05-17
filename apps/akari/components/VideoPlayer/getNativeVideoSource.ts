/**
 * Validate a playback URL and return the `source` shape expected by
 * `react-native-video`. Returns null when the URL is missing or
 * malformed so the caller can short-circuit playback.
 */
export function getNativeVideoSource(playbackUrl: string | null): { uri: string } | null {
  if (!playbackUrl || playbackUrl.trim() === '') {
    return null;
  }

  // Validate URL format (constructor throws on invalid input)
  try {
    const _validated = new URL(playbackUrl);
    void _validated;
  } catch {
    return null;
  }

  return { uri: playbackUrl };
}
