import type { Subscription } from './types.js';

function coerceTokenArray(entry: unknown, key: 'tokens' | 'expoPushTokens'): string[] | null {
  if (!entry || typeof entry !== 'object') return null;
  const value = (entry as Record<string, unknown>)[key];
  if (!Array.isArray(value)) return null;
  return value
    .map((token) => (typeof token === 'string' ? token.trim() : ''))
    .filter((token) => token.length > 0);
}

export function parseSubscriptionPayload(raw: unknown, context: string): Subscription[] {
  if (!Array.isArray(raw)) {
    throw new Error(`${context} must be an array.`);
  }

  return raw.map((entry, index) => {
    if (typeof entry !== 'object' || entry === null) {
      throw new Error(`${context} entry at index ${index} must be an object.`);
    }

    const did = 'did' in entry && typeof (entry as { did?: unknown }).did === 'string'
      ? ((entry as { did: string }).did.trim())
      : '';

    const tokens =
      coerceTokenArray(entry, 'tokens') ?? coerceTokenArray(entry, 'expoPushTokens') ?? [];

    if (!did) {
      throw new Error(`${context} entry at index ${index} is missing a valid did.`);
    }

    if (tokens.length === 0) {
      throw new Error(`${context} entry at index ${index} must include at least one Expo push token.`);
    }

    return { did, tokens } satisfies Subscription;
  });
}
