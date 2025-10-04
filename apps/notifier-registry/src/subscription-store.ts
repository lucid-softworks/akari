import { readFile, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { access } from 'node:fs/promises';

import { logger } from './logger.js';
import type { RegistryPayload, SubscriptionRecord } from './types.js';

const normaliseDid = (did: string | undefined): string | null => {
  if (!did) return null;
  const trimmed = did.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
};

const normaliseToken = (token: string | undefined): string | null => {
  if (!token) return null;
  const trimmed = token.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

function parsePersistedRecords(raw: unknown): SubscriptionRecord[] {
  if (!Array.isArray(raw)) {
    throw new Error('Persisted subscription data must be an array.');
  }

  return raw.map((entry, index) => {
    if (!isObject(entry)) {
      throw new Error(`Persisted subscription entry at index ${index} must be an object.`);
    }

    const did = normaliseDid(typeof entry.did === 'string' ? entry.did : undefined);
    if (!did) {
      throw new Error(`Persisted subscription entry at index ${index} is missing a valid did.`);
    }

    const tokens = Array.isArray(entry.tokens)
      ? entry.tokens
          .map((token) => normaliseToken(typeof token === 'string' ? token : undefined))
          .filter((token): token is string => Boolean(token))
      : [];

    if (tokens.length === 0) {
      throw new Error(`Persisted subscription entry at index ${index} must include at least one Expo push token.`);
    }

    return { did, tokens } satisfies SubscriptionRecord;
  });
}

const createRecordMap = (records: SubscriptionRecord[]): Map<string, Set<string>> => {
  const map = new Map<string, Set<string>>();
  for (const record of records) {
    map.set(record.did, new Set(record.tokens));
  }
  return map;
};

export class SubscriptionStore {
  private readonly dataFile?: string;
  private records: Map<string, Set<string>> = new Map();

  constructor(dataFile?: string) {
    this.dataFile = dataFile;
  }

  async load(): Promise<void> {
    if (!this.dataFile) return;

    try {
      await access(this.dataFile, fsConstants.F_OK);
    } catch (error) {
      logger.info('Subscription data file not found, starting with an empty registry.', {
        dataFile: this.dataFile,
      });
      return;
    }

    try {
      const raw = await readFile(this.dataFile, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      const records = parsePersistedRecords(parsed);
      this.records = createRecordMap(records);
      logger.info('Loaded subscriptions from disk.', { count: this.records.size });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load subscription data: ${message}`);
    }
  }

  async register(payload: RegistryPayload): Promise<{ isNewToken: boolean; totalTokens: number }> {
    const did = normaliseDid(payload.did);
    if (!did) {
      throw new Error('A valid did is required.');
    }

    const token = normaliseToken(payload.expoPushToken);
    if (!token) {
      throw new Error('A valid Expo push token is required.');
    }

    const existing = this.records.get(did) ?? new Set<string>();
    const previousSize = existing.size;
    existing.add(token);
    this.records.set(did, existing);

    await this.persist();

    return { isNewToken: existing.size !== previousSize, totalTokens: existing.size };
  }

  async unregister(payload: RegistryPayload): Promise<{ removed: boolean; totalTokens: number }> {
    const did = normaliseDid(payload.did);
    if (!did) {
      throw new Error('A valid did is required.');
    }

    const token = normaliseToken(payload.expoPushToken);
    if (!token) {
      throw new Error('A valid Expo push token is required.');
    }

    const existing = this.records.get(did);
    if (!existing) {
      return { removed: false, totalTokens: 0 };
    }

    const removed = existing.delete(token);

    if (existing.size === 0) {
      this.records.delete(did);
    } else {
      this.records.set(did, existing);
    }

    if (removed) {
      await this.persist();
    }

    return { removed, totalTokens: this.records.get(did)?.size ?? 0 };
  }

  getAll(): SubscriptionRecord[] {
    return [...this.records.entries()]
      .sort(([aDid], [bDid]) => aDid.localeCompare(bDid))
      .map(([did, tokens]) => ({ did, tokens: [...tokens] }));
  }

  private async persist(): Promise<void> {
    if (!this.dataFile) return;

    const records = this.getAll();
    await writeFile(this.dataFile, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
  }
}
