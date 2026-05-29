import { describe, it, expect } from '@jest/globals';
import { normaliseDid, didFromUri } from './dids.js';

describe('normaliseDid', () => {
  it('returns null for undefined', () => {
    expect(normaliseDid(undefined)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(normaliseDid('')).toBeNull();
  });

  it('returns null for a whitespace-only string', () => {
    expect(normaliseDid('   ')).toBeNull();
  });

  it('trims and lowercases the value', () => {
    expect(normaliseDid('  DID:PLC:ABC  ')).toBe('did:plc:abc');
  });
});

describe('didFromUri', () => {
  it('returns null for undefined', () => {
    expect(didFromUri(undefined)).toBeNull();
  });

  it('returns null when the uri does not start with at://', () => {
    expect(didFromUri('https://example.com/foo')).toBeNull();
  });

  it('extracts and normalises the did from an at:// uri', () => {
    expect(didFromUri('at://DID:PLC:ABC/app.bsky.feed.post/rkey')).toBe('did:plc:abc');
  });

  it('handles an at:// uri with only a did and no trailing path', () => {
    expect(didFromUri('at://did:plc:abc')).toBe('did:plc:abc');
  });

  it('returns null when the at:// uri has an empty did segment', () => {
    expect(didFromUri('at:///app.bsky.feed.post')).toBeNull();
  });
});
