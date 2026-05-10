import React, { type ComponentType } from 'react';
import { NativeModules, TurboModuleRegistry } from 'react-native';

import type { StreamPlaceWebRTCPlayerProps } from './StreamPlaceWebRTCPlayer';
export type { StreamPlaceWebRTCPlayerProps };

/**
 * Wrapper around the actual WebRTC player. The implementation file
 * statically imports `react-native-webrtc`, which evaluates a
 * top-level `new NativeEventEmitter(WebRTCModule)`. Under New Arch
 * bridgeless mode the legacy `WebRTCModule` doesn't surface in
 * `NativeModules`, so that import would crash the entire app at
 * startup with "new NativeEventEmitter() requires a non-null
 * argument".
 *
 * To stay safe across builds with and without WebRTC linked in, we:
 *   1. Probe `NativeModules.WebRTCModule` first (cheap, no import).
 *   2. Only `require` the impl module when the probe passes — so on
 *      builds without WebRTC the impl file is never evaluated and
 *      its top-level NativeEventEmitter call never fires.
 *   3. Cache the result so we don't re-probe on every render.
 *
 * `isStreamPlaceWebRTCAvailable` lets the parent decide whether to
 * even attempt the WebRTC path or fall straight to the WebView
 * fallback.
 */

let cachedImpl: ComponentType<StreamPlaceWebRTCPlayerProps> | null | undefined;

function isWebRTCModuleRegistered(): boolean {
  // Bridge mode (legacy + new arch) surfaces native modules here.
  if (NativeModules.WebRTCModule) return true;
  // Bridgeless mode (new arch default in SDK 54) only surfaces them
  // through the TurboModuleRegistry — `NativeModules.X` returns null
  // for legacy modules. Our patch to react-native-webrtc's
  // EventEmitter mirrors this fallback so the JS-side import doesn't
  // crash when only the TurboModule path is wired.
  try {
    return TurboModuleRegistry.get('WebRTCModule') != null;
  } catch {
    return false;
  }
}

function loadImpl(): ComponentType<StreamPlaceWebRTCPlayerProps> | null {
  if (cachedImpl !== undefined) return cachedImpl;
  if (!isWebRTCModuleRegistered()) {
    cachedImpl = null;
    return null;
  }
  try {
    // Lazy require keeps react-native-webrtc out of the app's startup
    // graph entirely when the native module is missing.
    const mod = require('./StreamPlaceWebRTCPlayer.impl.native') as {
      StreamPlaceWebRTCPlayerImpl: ComponentType<StreamPlaceWebRTCPlayerProps>;
    };
    cachedImpl = mod.StreamPlaceWebRTCPlayerImpl;
  } catch (error) {
    if (__DEV__) console.warn('react-native-webrtc unavailable, falling back', error);
    cachedImpl = null;
  }
  return cachedImpl;
}

export function isStreamPlaceWebRTCAvailable(): boolean {
  return loadImpl() != null;
}

export function StreamPlaceWebRTCPlayer(props: StreamPlaceWebRTCPlayerProps) {
  const Impl = loadImpl();
  if (!Impl) return null;
  return <Impl {...props} />;
}
