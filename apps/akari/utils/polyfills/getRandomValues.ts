import { getRandomBytes } from 'expo-crypto';

/**
 * Hermes (and the React Native runtime) doesn't ship a `crypto` global by
 * default, so libraries that expect Web Crypto's `crypto.getRandomValues`
 * (here: `@noble/curves` for DPoP keygen and ECDSA `k`) have nothing to
 * call. Bridge to `expo-crypto.getRandomBytes`, which is already part of
 * the existing native binary — keeps OAuth working without forcing a
 * fresh `expo run:ios` to add a new native module.
 *
 * On platforms that already provide `crypto.getRandomValues` (browsers,
 * Node, jsdom under jest), this is a no-op.
 */
const existing = (globalThis as { crypto?: { getRandomValues?: unknown } }).crypto;
if (!existing || typeof existing.getRandomValues !== 'function') {
  const cryptoTarget = (existing ?? {}) as {
    getRandomValues?: <T extends ArrayBufferView>(view: T) => T;
  };
  cryptoTarget.getRandomValues = function getRandomValues<T extends ArrayBufferView>(view: T): T {
    if (!view || typeof view.byteLength !== 'number') {
      throw new TypeError('getRandomValues expects an ArrayBufferView');
    }
    const bytes = getRandomBytes(view.byteLength);
    new Uint8Array(view.buffer, view.byteOffset, view.byteLength).set(bytes);
    return view;
  };
  (globalThis as { crypto?: typeof cryptoTarget }).crypto = cryptoTarget;
}
