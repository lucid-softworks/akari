/**
 * Minimal ambient declaration for `react-native-webrtc`. The package
 * ships its own types once it's installed; this stub keeps `tsc`
 * happy when the dependency hasn't been pulled in yet (e.g. CI runs
 * before a fresh `npm install`, or contributors who skip the native
 * deps because they only build for web).
 *
 * Only covers the API surface `StreamPlaceWebRTCPlayer` actually
 * touches. If you reach for more of the package, extend this.
 */
declare module 'react-native-webrtc' {
  import type { ComponentType } from 'react';
  import type { ViewProps } from 'react-native';

  export class MediaStream {
    toURL(): string;
  }

  export class RTCSessionDescription {
    constructor(init: { type: 'offer' | 'answer' | 'pranswer' | 'rollback'; sdp: string });
    type: string;
    sdp: string;
  }

  // oxlint-disable-next-line typescript/no-extraneous-class -- mirrors react-native-webrtc's exported class shape so consumers can `new RTCIceCandidate(...)`
  export class RTCIceCandidate {
    constructor(init: { sdpMid?: string | null; sdpMLineIndex?: number | null; candidate: string });
  }

  export type RTCConfiguration = {
    bundlePolicy?: 'balanced' | 'max-compat' | 'max-bundle';
    iceServers?: { urls: string | string[]; username?: string; credential?: string }[];
  };

  export type RTCRtpTransceiverInit = {
    direction?: 'sendrecv' | 'sendonly' | 'recvonly' | 'inactive';
  };

  export class RTCPeerConnection {
    constructor(config?: RTCConfiguration);
    readonly connectionState: string;
    readonly iceGatheringState: string;
    readonly localDescription: RTCSessionDescription | null;

    addTransceiver(kind: 'audio' | 'video', init?: RTCRtpTransceiverInit): unknown;
    createOffer(options?: Record<string, unknown>): Promise<RTCSessionDescription>;
    setLocalDescription(desc: RTCSessionDescription): Promise<void>;
    setRemoteDescription(desc: RTCSessionDescription): Promise<void>;
    addEventListener(event: string, handler: (event: unknown) => void): void;
    removeEventListener(event: string, handler: (event: unknown) => void): void;
    close(): void;
  }

  export type RTCViewProps = ViewProps & {
    streamURL: string;
    objectFit?: 'contain' | 'cover';
    mirror?: boolean;
    zOrder?: number;
  };

  export const RTCView: ComponentType<RTCViewProps>;
}
