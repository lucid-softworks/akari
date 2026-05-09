import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import {
  MediaStream,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCView,
} from 'react-native-webrtc';

import { ThemedText } from '@/components/ThemedText';
import { fontSize, fontWeight, spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';
import {
  fetchStreamPlacePlaybackServers,
  negotiateStreamPlaceWhep,
  STREAM_PLACE_DEFAULT_HOST,
} from '@/utils/streamPlace';

import type { StreamPlaceWebRTCPlayerProps } from './StreamPlaceWebRTCPlayer';
export type { StreamPlaceWebRTCPlayerProps };

type Status =
  | { kind: 'connecting' }
  | { kind: 'playing' }
  | { kind: 'error'; message: string };

/**
 * Native-only WebRTC player for stream.place broadcasts. Reproduces
 * the WHEP exchange the upstream `streamplace` JS player runs:
 *
 *   1. Open an RTCPeerConnection with `bundlePolicy: 'max-bundle'`.
 *   2. Add recvonly video + audio transceivers (we never send media,
 *      we just want to receive the broadcast).
 *   3. Build an SDP offer and finish ICE gathering (capped at 1s so a
 *      hostile network can't stall the player forever).
 *   4. POST the offer SDP to `place.stream.playback.whep` for the
 *      streamer's DID; the response body is the SDP answer.
 *   5. setRemoteDescription with that answer.
 *   6. Hand the resulting MediaStream to RTCView.
 *
 * On unmount we close the peer connection so we don't leak ICE
 * sessions across navigations.
 */
export function StreamPlaceWebRTCPlayerImpl({ streamerDid }: StreamPlaceWebRTCPlayerProps) {
  const { t } = useTranslation();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'connecting' });
  const peerRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    let cancelled = false;
    const peer = new RTCPeerConnection({
      bundlePolicy: 'max-bundle',
      // expo-managed-friendly default STUN; stream.place's own player
      // doesn't pass anything explicit either and relies on the
      // browser default, but RN-WebRTC has no implicit fallback.
      iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
    });
    peerRef.current = peer;

    peer.addTransceiver('video', { direction: 'recvonly' });
    peer.addTransceiver('audio', { direction: 'recvonly' });

    // The track event fires once per inbound media track; the
    // associated `streams[0]` is the same MediaStream for both audio
    // and video, so first wins.
    const onTrack = (event: unknown) => {
      if (cancelled) return;
      const streams = (event as { streams?: MediaStream[] }).streams;
      const incoming = streams?.[0];
      if (incoming) setStream(incoming);
    };
    peer.addEventListener('track', onTrack);

    const onConnectionStateChange = () => {
      if (cancelled) return;
      const state = peer.connectionState;
      if (state === 'connected') {
        setStatus({ kind: 'playing' });
      } else if (state === 'failed' || state === 'closed' || state === 'disconnected') {
        setStatus({ kind: 'error', message: state });
      }
    };
    peer.addEventListener('connectionstatechange', onConnectionStateChange);

    const negotiate = async () => {
      try {
        // Resolve the closest playback host first. stream.place
        // returns hosts ordered by edge proximity; using the first
        // one shaves WebRTC handshake latency on every play. A
        // failed lookup is non-fatal — fall back to the default
        // host so playback still tries.
        let playbackHost = STREAM_PLACE_DEFAULT_HOST;
        try {
          const lookup = await fetchStreamPlacePlaybackServers(streamerDid);
          if (cancelled) return;
          if (lookup.servers[0]) playbackHost = lookup.servers[0];
        } catch (lookupError) {
          if (__DEV__) console.warn('stream.place getPlaybackServer failed', lookupError);
        }

        const offer = await peer.createOffer({});
        await peer.setLocalDescription(offer);
        // Wait up to 1s for ICE gathering. atproto WHEP doesn't
        // support trickle ICE (the offer goes in a single POST), so
        // we need every candidate before we send.
        await waitForIceGathering(peer);
        if (cancelled) return;
        const local = peer.localDescription;
        if (!local?.sdp) {
          throw new Error('Empty local SDP after ICE gathering');
        }
        const result = await negotiateStreamPlaceWhep(streamerDid, local.sdp, {
          playbackHost,
        });
        if (cancelled) return;
        await peer.setRemoteDescription(
          new RTCSessionDescription({ type: 'answer', sdp: result.sdp }),
        );
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'unknown';
        setStatus({ kind: 'error', message });
        if (__DEV__) console.warn('stream.place WHEP failed', error);
      }
    };

    void negotiate();

    return () => {
      cancelled = true;
      peerRef.current = null;
      peer.close();
    };
  }, [streamerDid]);

  return (
    <View style={styles.container}>
      {stream ? (
        <RTCView
          streamURL={stream.toURL()}
          style={styles.video}
          objectFit="contain"
          mirror={false}
        />
      ) : null}
      {status.kind === 'connecting' && !stream ? (
        <View pointerEvents="none" style={styles.overlay}>
          <ActivityIndicator color="#FFFFFF" size="large" />
        </View>
      ) : null}
      {status.kind === 'error' ? (
        <View pointerEvents="none" style={[styles.overlay, styles.errorOverlay]}>
          <ThemedText style={styles.errorText}>
            {t('common.somethingWentWrong')}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

/**
 * atproto WHEP wraps the offer in a single POST, which means we can't
 * trickle ICE candidates after the fact — every candidate has to be
 * baked into the offer SDP. Block until `iceGatheringState === 'complete'`
 * or 1 second elapses (matching streamplace's own client).
 */
function waitForIceGathering(peer: RTCPeerConnection): Promise<void> {
  if (peer.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise<void>((resolve) => {
    const timeout = setTimeout(() => resolve(), 1000);
    const handler = () => {
      if (peer.iceGatheringState === 'complete') {
        clearTimeout(timeout);
        peer.removeEventListener('icegatheringstatechange', handler);
        resolve();
      }
    };
    peer.addEventListener('icegatheringstatechange', handler);
  });
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    paddingHorizontal: spacing.md,
    textAlign: 'center',
  },
});
