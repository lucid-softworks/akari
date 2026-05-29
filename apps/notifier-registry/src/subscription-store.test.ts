import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Node builtin ESM modules cannot be reliably mocked via unstable_mockModule
// in this ts-jest ESM setup, so persistence is exercised against an isolated
// temp directory that is created and removed per test. No production paths or
// network are touched.

import { SubscriptionStore } from './subscription-store.js';

const basePayload = {
  did: 'did:plc:abc',
  expoPushToken: 'ExpoToken[xyz]',
  platform: 'ios',
} as const;

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'notifier-registry-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

const dataFile = () => join(tempDir, 'data.json');

describe('SubscriptionStore.register', () => {
  it('adds a new token for a new did', async () => {
    const store = new SubscriptionStore();
    const result = await store.register({ ...basePayload });
    expect(result).toEqual({ isNewToken: true, totalTokens: 1 });
    expect(store.getAll()).toEqual([{ did: 'did:plc:abc', tokens: ['ExpoToken[xyz]'] }]);
  });

  it('normalises the did to lowercase and trims', async () => {
    const store = new SubscriptionStore();
    await store.register({ ...basePayload, did: '  DID:PLC:ABC  ' });
    expect(store.getAll()[0].did).toBe('did:plc:abc');
  });

  it('trims the token but preserves case', async () => {
    const store = new SubscriptionStore();
    await store.register({ ...basePayload, expoPushToken: '  ExpoToken[XYZ]  ' });
    expect(store.getAll()[0].tokens).toEqual(['ExpoToken[XYZ]']);
  });

  it('dedups identical tokens for the same did', async () => {
    const store = new SubscriptionStore();
    await store.register({ ...basePayload });
    const result = await store.register({ ...basePayload });
    expect(result).toEqual({ isNewToken: false, totalTokens: 1 });
    expect(store.getAll()[0].tokens).toEqual(['ExpoToken[xyz]']);
  });

  it('appends additional distinct tokens for the same did', async () => {
    const store = new SubscriptionStore();
    await store.register({ ...basePayload, expoPushToken: 'token-1' });
    const result = await store.register({ ...basePayload, expoPushToken: 'token-2' });
    expect(result).toEqual({ isNewToken: true, totalTokens: 2 });
    expect(store.getAll()[0].tokens.sort()).toEqual(['token-1', 'token-2']);
  });

  it('throws when did is missing or empty', async () => {
    const store = new SubscriptionStore();
    await expect(store.register({ ...basePayload, did: '   ' })).rejects.toThrow('A valid did is required.');
  });

  it('throws when token is missing or empty', async () => {
    const store = new SubscriptionStore();
    await expect(store.register({ ...basePayload, expoPushToken: '   ' })).rejects.toThrow(
      'A valid Expo push token is required.',
    );
  });

  it('does not write a file when no data file is configured', async () => {
    const store = new SubscriptionStore();
    await store.register({ ...basePayload });
    // nothing to assert on disk; absence of throw and correct in-memory state suffice
    expect(store.getAll()).toHaveLength(1);
  });

  it('persists to disk when a data file is configured', async () => {
    const store = new SubscriptionStore(dataFile());
    await store.register({ ...basePayload });
    const written = await readFile(dataFile(), 'utf8');
    expect(JSON.parse(written)).toEqual([{ did: 'did:plc:abc', tokens: ['ExpoToken[xyz]'] }]);
    expect(written.endsWith('\n')).toBe(true);
  });
});

describe('SubscriptionStore.unregister', () => {
  it('removes an existing token and deletes the did when empty', async () => {
    const store = new SubscriptionStore();
    await store.register({ ...basePayload });
    const result = await store.unregister({ ...basePayload });
    expect(result).toEqual({ removed: true, totalTokens: 0 });
    expect(store.getAll()).toEqual([]);
  });

  it('keeps the did when other tokens remain', async () => {
    const store = new SubscriptionStore();
    await store.register({ ...basePayload, expoPushToken: 'token-1' });
    await store.register({ ...basePayload, expoPushToken: 'token-2' });
    const result = await store.unregister({ ...basePayload, expoPushToken: 'token-1' });
    expect(result).toEqual({ removed: true, totalTokens: 1 });
    expect(store.getAll()[0].tokens).toEqual(['token-2']);
  });

  it('returns removed:false for an unknown did', async () => {
    const store = new SubscriptionStore();
    const result = await store.unregister({ ...basePayload, did: 'did:plc:unknown' });
    expect(result).toEqual({ removed: false, totalTokens: 0 });
  });

  it('returns removed:false when the token is not present for a known did', async () => {
    const store = new SubscriptionStore();
    await store.register({ ...basePayload, expoPushToken: 'token-1' });
    const result = await store.unregister({ ...basePayload, expoPushToken: 'token-missing' });
    expect(result).toEqual({ removed: false, totalTokens: 1 });
  });

  it('throws when did is invalid', async () => {
    const store = new SubscriptionStore();
    await expect(store.unregister({ ...basePayload, did: '  ' })).rejects.toThrow('A valid did is required.');
  });

  it('throws when token is invalid', async () => {
    const store = new SubscriptionStore();
    await expect(store.unregister({ ...basePayload, expoPushToken: '  ' })).rejects.toThrow(
      'A valid Expo push token is required.',
    );
  });

  it('does not change the file when nothing was removed', async () => {
    const store = new SubscriptionStore(dataFile());
    await store.register({ ...basePayload, expoPushToken: 'token-1' });
    const before = await readFile(dataFile(), 'utf8');
    await store.unregister({ ...basePayload, expoPushToken: 'token-missing' });
    const after = await readFile(dataFile(), 'utf8');
    expect(after).toBe(before);
  });

  it('persists after a successful removal', async () => {
    const store = new SubscriptionStore(dataFile());
    await store.register({ ...basePayload, expoPushToken: 'token-1' });
    await store.register({ ...basePayload, expoPushToken: 'token-2' });
    await store.unregister({ ...basePayload, expoPushToken: 'token-1' });
    const written = await readFile(dataFile(), 'utf8');
    expect(JSON.parse(written)).toEqual([{ did: 'did:plc:abc', tokens: ['token-2'] }]);
  });
});

describe('SubscriptionStore.getAll', () => {
  it('returns records sorted by did', async () => {
    const store = new SubscriptionStore();
    await store.register({ ...basePayload, did: 'did:plc:zebra' });
    await store.register({ ...basePayload, did: 'did:plc:apple' });
    expect(store.getAll().map((r) => r.did)).toEqual(['did:plc:apple', 'did:plc:zebra']);
  });

  it('returns an empty array for a fresh store', () => {
    expect(new SubscriptionStore().getAll()).toEqual([]);
  });
});

describe('SubscriptionStore.load', () => {
  it('is a no-op when no data file is configured', async () => {
    const store = new SubscriptionStore();
    await store.load();
    expect(store.getAll()).toEqual([]);
  });

  it('starts empty when the data file does not exist', async () => {
    const store = new SubscriptionStore(join(tempDir, 'missing.json'));
    await store.load();
    expect(store.getAll()).toEqual([]);
  });

  it('loads and parses persisted records', async () => {
    await writeFile(
      dataFile(),
      JSON.stringify([
        { did: 'DID:PLC:ONE', tokens: ['  token-a  ', 'token-b'] },
        { did: 'did:plc:two', tokens: ['token-c'] },
      ]),
      'utf8',
    );
    const store = new SubscriptionStore(dataFile());
    await store.load();
    expect(store.getAll()).toEqual([
      { did: 'did:plc:one', tokens: ['token-a', 'token-b'] },
      { did: 'did:plc:two', tokens: ['token-c'] },
    ]);
  });

  it('filters out non-string and empty tokens', async () => {
    await writeFile(
      dataFile(),
      JSON.stringify([{ did: 'did:plc:one', tokens: ['token-a', '', 42, null, '  '] }]),
      'utf8',
    );
    const store = new SubscriptionStore(dataFile());
    await store.load();
    expect(store.getAll()).toEqual([{ did: 'did:plc:one', tokens: ['token-a'] }]);
  });

  it('throws when persisted data is not an array', async () => {
    await writeFile(dataFile(), JSON.stringify({ not: 'an array' }), 'utf8');
    const store = new SubscriptionStore(dataFile());
    await expect(store.load()).rejects.toThrow('Persisted subscription data must be an array.');
  });

  it('throws when an entry is not an object', async () => {
    await writeFile(dataFile(), JSON.stringify(['not-an-object']), 'utf8');
    const store = new SubscriptionStore(dataFile());
    await expect(store.load()).rejects.toThrow('Persisted subscription entry at index 0 must be an object.');
  });

  it('throws when an entry is missing a valid did', async () => {
    await writeFile(dataFile(), JSON.stringify([{ tokens: ['token-a'] }]), 'utf8');
    const store = new SubscriptionStore(dataFile());
    await expect(store.load()).rejects.toThrow('Persisted subscription entry at index 0 is missing a valid did.');
  });

  it('throws when an entry has no valid tokens', async () => {
    await writeFile(dataFile(), JSON.stringify([{ did: 'did:plc:one', tokens: [] }]), 'utf8');
    const store = new SubscriptionStore(dataFile());
    await expect(store.load()).rejects.toThrow(
      'Persisted subscription entry at index 0 must include at least one Expo push token.',
    );
  });

  it('throws when tokens field is missing entirely', async () => {
    await writeFile(dataFile(), JSON.stringify([{ did: 'did:plc:one' }]), 'utf8');
    const store = new SubscriptionStore(dataFile());
    await expect(store.load()).rejects.toThrow(
      'Persisted subscription entry at index 0 must include at least one Expo push token.',
    );
  });

  it('wraps JSON parse errors', async () => {
    await writeFile(dataFile(), 'not valid json', 'utf8');
    const store = new SubscriptionStore(dataFile());
    await expect(store.load()).rejects.toThrow(/Failed to load subscription data:/);
  });

  it('round-trips data written by register through load', async () => {
    const writer = new SubscriptionStore(dataFile());
    await writer.register({ ...basePayload, expoPushToken: 'token-1' });
    await writer.register({ ...basePayload, expoPushToken: 'token-2' });

    const reader = new SubscriptionStore(dataFile());
    await reader.load();
    expect(reader.getAll()).toEqual([{ did: 'did:plc:abc', tokens: ['token-1', 'token-2'] }]);
  });
});
