import { useCallback, useSyncExternalStore } from 'react';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'verification-settings' });
const ENABLED_KEY = 'verification_badges_enabled';
const TRUSTED_DIDS_KEY = 'trusted_verifier_dids';

type VerificationSettingsSnapshot = {
  /** Master toggle: when false, no verification UI is rendered anywhere. */
  badgesEnabled: boolean;
  /** DIDs the user has explicitly opted in to trust as verifiers. */
  trustedVerifierDids: readonly string[];
};

let cached: VerificationSettingsSnapshot | null = null;
const listeners = new Set<() => void>();

function readEnabled(): boolean {
  try {
    return storage.getBoolean(ENABLED_KEY) ?? true;
  } catch {
    return true;
  }
}

function readTrusted(): readonly string[] {
  try {
    const raw = storage.getString(TRUSTED_DIDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === 'string');
  } catch {
    return [];
  }
}

function readAll(): VerificationSettingsSnapshot {
  return {
    badgesEnabled: readEnabled(),
    trustedVerifierDids: readTrusted(),
  };
}

function getSnapshot(): VerificationSettingsSnapshot {
  if (cached === null) cached = readAll();
  return cached;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  cached = readAll();
  for (const l of listeners) l();
}

export function useVerificationSettings() {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setBadgesEnabled = useCallback((enabled: boolean) => {
    storage.set(ENABLED_KEY, enabled);
    notify();
  }, []);

  const addTrustedVerifier = useCallback((did: string) => {
    const current = readTrusted();
    if (current.includes(did)) return;
    storage.set(TRUSTED_DIDS_KEY, JSON.stringify([...current, did]));
    notify();
  }, []);

  const removeTrustedVerifier = useCallback((did: string) => {
    const current = readTrusted();
    if (!current.includes(did)) return;
    storage.set(TRUSTED_DIDS_KEY, JSON.stringify(current.filter((entry) => entry !== did)));
    notify();
  }, []);

  const isTrustedVerifier = useCallback(
    (did: string) => value.trustedVerifierDids.includes(did),
    [value.trustedVerifierDids],
  );

  return {
    badgesEnabled: value.badgesEnabled,
    setBadgesEnabled,
    trustedVerifierDids: value.trustedVerifierDids,
    addTrustedVerifier,
    removeTrustedVerifier,
    isTrustedVerifier,
  };
}
