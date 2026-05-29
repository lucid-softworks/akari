import { describe, it, expect } from '@jest/globals';
import { parseSubscriptionPayload } from './subscription-utils.js';

describe('parseSubscriptionPayload', () => {
  it('throws when the payload is not an array', () => {
    expect(() => parseSubscriptionPayload({}, 'Ctx')).toThrow('Ctx must be an array.');
    expect(() => parseSubscriptionPayload(null, 'Ctx')).toThrow('Ctx must be an array.');
    expect(() => parseSubscriptionPayload('nope', 'Ctx')).toThrow('Ctx must be an array.');
  });

  it('throws when an entry is not an object', () => {
    expect(() => parseSubscriptionPayload(['x'], 'Ctx')).toThrow(
      'Ctx entry at index 0 must be an object.',
    );
  });

  it('throws when an entry is null', () => {
    expect(() => parseSubscriptionPayload([null], 'Ctx')).toThrow(
      'Ctx entry at index 0 must be an object.',
    );
  });

  it('throws when the did is missing', () => {
    expect(() => parseSubscriptionPayload([{ tokens: ['a'] }], 'Ctx')).toThrow(
      'Ctx entry at index 0 is missing a valid did.',
    );
  });

  it('throws when the did is blank or whitespace', () => {
    expect(() => parseSubscriptionPayload([{ did: '   ', tokens: ['a'] }], 'Ctx')).toThrow(
      'Ctx entry at index 0 is missing a valid did.',
    );
  });

  it('throws when the did is not a string', () => {
    expect(() => parseSubscriptionPayload([{ did: 123, tokens: ['a'] }], 'Ctx')).toThrow(
      'Ctx entry at index 0 is missing a valid did.',
    );
  });

  it('throws when there are no tokens at all', () => {
    expect(() => parseSubscriptionPayload([{ did: 'did:plc:abc' }], 'Ctx')).toThrow(
      'Ctx entry at index 0 must include at least one Expo push token.',
    );
  });

  it('throws when tokens is present but empty', () => {
    expect(() => parseSubscriptionPayload([{ did: 'did:plc:abc', tokens: [] }], 'Ctx')).toThrow(
      'Ctx entry at index 0 must include at least one Expo push token.',
    );
  });

  it('throws when tokens contains only blank/non-string entries', () => {
    expect(() =>
      parseSubscriptionPayload([{ did: 'did:plc:abc', tokens: ['  ', 42, null] }], 'Ctx'),
    ).toThrow('Ctx entry at index 0 must include at least one Expo push token.');
  });

  it('parses a valid entry with tokens', () => {
    const result = parseSubscriptionPayload([{ did: 'did:plc:abc', tokens: ['t1', 't2'] }], 'Ctx');
    expect(result).toEqual([{ did: 'did:plc:abc', tokens: ['t1', 't2'] }]);
  });

  it('trims the did and filters/trims tokens', () => {
    const result = parseSubscriptionPayload(
      [{ did: '  did:plc:abc  ', tokens: [' t1 ', '', '  ', 't2'] }],
      'Ctx',
    );
    expect(result).toEqual([{ did: 'did:plc:abc', tokens: ['t1', 't2'] }]);
  });

  it('falls back to expoPushTokens when tokens is absent', () => {
    const result = parseSubscriptionPayload(
      [{ did: 'did:plc:abc', expoPushTokens: ['e1', 'e2'] }],
      'Ctx',
    );
    expect(result).toEqual([{ did: 'did:plc:abc', tokens: ['e1', 'e2'] }]);
  });

  it('prefers tokens over expoPushTokens when both present and tokens is a valid array', () => {
    const result = parseSubscriptionPayload(
      [{ did: 'did:plc:abc', tokens: ['t1'], expoPushTokens: ['e1'] }],
      'Ctx',
    );
    expect(result).toEqual([{ did: 'did:plc:abc', tokens: ['t1'] }]);
  });

  it('falls back to expoPushTokens when tokens is present but not an array', () => {
    const result = parseSubscriptionPayload(
      [{ did: 'did:plc:abc', tokens: 'not-an-array', expoPushTokens: ['e1'] }],
      'Ctx',
    );
    expect(result).toEqual([{ did: 'did:plc:abc', tokens: ['e1'] }]);
  });

  it('parses multiple entries and reports the correct failing index', () => {
    expect(() =>
      parseSubscriptionPayload(
        [
          { did: 'did:plc:a', tokens: ['t'] },
          { did: '', tokens: ['t'] },
        ],
        'Ctx',
      ),
    ).toThrow('Ctx entry at index 1 is missing a valid did.');
  });

  it('returns an empty array for an empty payload', () => {
    expect(parseSubscriptionPayload([], 'Ctx')).toEqual([]);
  });
});
