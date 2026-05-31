import { isMastodonProfileIncomplete } from '@/utils/mastodon/profile';
import type { MastodonCredentialAccount } from '@/utils/mastodon/token';

const baseFilled: MastodonCredentialAccount = {
  id: '1',
  username: 'alice',
  acct: 'alice',
  display_name: 'Alice Wonderland',
  avatar: 'https://cdn.example/avatars/abc.png',
  header: 'https://cdn.example/headers/def.png',
  note: '<p>Hello world</p>',
  url: 'https://mastodon.social/@alice',
  discoverable: true,
  source: { note: 'Hello world' },
};

describe('isMastodonProfileIncomplete', () => {
  it('returns false for a fully-filled profile', () => {
    expect(isMastodonProfileIncomplete(baseFilled)).toBe(false);
  });

  it('flags an account whose avatar URL is the placeholder', () => {
    expect(
      isMastodonProfileIncomplete({
        ...baseFilled,
        avatar: 'https://cdn.example/avatars/original/missing.png',
      }),
    ).toBe(true);
  });

  it('flags an account whose header URL is the placeholder', () => {
    expect(
      isMastodonProfileIncomplete({
        ...baseFilled,
        header: 'https://cdn.example/headers/original/missing.png',
      }),
    ).toBe(true);
  });

  it('flags an empty display name', () => {
    expect(isMastodonProfileIncomplete({ ...baseFilled, display_name: '' })).toBe(true);
  });

  it('flags a display name that just echoes the username (server default)', () => {
    expect(
      isMastodonProfileIncomplete({ ...baseFilled, display_name: 'alice' }),
    ).toBe(true);
  });

  it('flags an empty bio when both source.note and note are empty', () => {
    expect(
      isMastodonProfileIncomplete({
        ...baseFilled,
        note: '',
        source: { note: '' },
      }),
    ).toBe(true);
  });

  it('treats whitespace-only HTML note as empty', () => {
    expect(
      isMastodonProfileIncomplete({
        ...baseFilled,
        note: '<p>   </p>',
        source: undefined,
      }),
    ).toBe(true);
  });

  it('considers a note set via source.note as filled even when render note is empty', () => {
    expect(
      isMastodonProfileIncomplete({
        ...baseFilled,
        note: '',
        source: { note: 'real bio text' },
      }),
    ).toBe(false);
  });

  it('does not flag on discoverable being false (opt-in is a real end state)', () => {
    expect(
      isMastodonProfileIncomplete({ ...baseFilled, discoverable: false }),
    ).toBe(false);
  });
});
