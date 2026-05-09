/**
 * Web stub. Web posts render stream.place inline via the LiveStreamEmbed
 * iframe; the WebRTC player only exists on native.
 *
 * `isStreamPlaceWebRTCAvailable` is false here so LiveStreamEmbed
 * never tries to mount the player on web. The native variant of
 * this file (`.native.tsx`) does the real availability probe.
 */
export type StreamPlaceWebRTCPlayerProps = {
  streamerDid: string;
};

export function StreamPlaceWebRTCPlayer(_props: StreamPlaceWebRTCPlayerProps) {
  return null;
}

export function isStreamPlaceWebRTCAvailable(): boolean {
  return false;
}
