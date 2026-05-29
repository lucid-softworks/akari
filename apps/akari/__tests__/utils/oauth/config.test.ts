// Inject a controlled scope catalog so we can exercise every branch of
// buildSelectedScopeString / defaultScopeSelection (required vs optional flat
// scopes, tokens fan-out, requiredActions vs user-toggled repo actions).
const flatScopes = [
  { id: 'atproto', required: true, defaultEnabled: true, labelKey: 'l', descriptionKey: 'd' },
  // optional, off by default
  { id: 'optional-scope', required: false, defaultEnabled: false, labelKey: 'l', descriptionKey: 'd' },
  // optional, on by default
  { id: 'default-on', required: false, defaultEnabled: true, labelKey: 'l', descriptionKey: 'd' },
  // required + token fan-out
  { id: 'blobs', tokens: ['blobs?accept=image/*'], required: true, defaultEnabled: true, labelKey: 'l', descriptionKey: 'd' },
];

const repoScopes = [
  {
    collection: 'app.example.post',
    actions: ['create', 'update', 'delete'],
    defaultActions: ['create'],
    requiredActions: ['create'],
    labelKey: 'l',
    descriptionKey: 'd',
  },
  {
    collection: 'app.example.like',
    actions: ['create', 'delete'],
    defaultActions: ['create', 'delete'],
    labelKey: 'l',
    descriptionKey: 'd',
  },
];

jest.mock('@/scripts/lib/oauth-scope-data', () => ({
  flatScopes,
  repoScopes,
  buildFullScopeString: () => 'atproto full-scope-string',
}));

import {
  OAUTH_CLIENT_ID,
  OAUTH_FLAT_SCOPES,
  OAUTH_FULL_SCOPE,
  OAUTH_REDIRECT_URI,
  OAUTH_REPO_SCOPES,
  OAUTH_SCOPE,
  buildSelectedScopeString,
  defaultScopeSelection,
  type ScopeSelection,
} from '@/utils/oauth/config';

describe('config constants (native / ios platform)', () => {
  it('uses the native client metadata URL on non-web platforms', () => {
    expect(OAUTH_CLIENT_ID).toBe(
      'https://akari.lucidsoft.works/.well-known/oauth-client.json',
    );
  });

  it('uses the reverse-DNS custom-scheme redirect on native', () => {
    expect(OAUTH_REDIRECT_URI).toBe('works.lucidsoft.akari:/oauth/callback');
  });

  it('re-exports the (mocked) scope catalog', () => {
    expect(OAUTH_FLAT_SCOPES).toBe(flatScopes);
    expect(OAUTH_REPO_SCOPES).toBe(repoScopes);
  });

  it('OAUTH_FULL_SCOPE delegates to buildFullScopeString', () => {
    expect(OAUTH_FULL_SCOPE).toBe('atproto full-scope-string');
  });
});

describe('buildSelectedScopeString', () => {
  it('forces required flat scopes on even when the selection omits them', () => {
    const selection: ScopeSelection = { flat: {}, repo: {} };
    const result = buildSelectedScopeString(selection);
    expect(result).toContain('atproto');
    // token fan-out expands to the literal tokens, not the id
    expect(result).toContain('blobs?accept=image/*');
    expect(result).not.toContain('blobs ');
  });

  it('drops optional flat scopes that the selection does not enable', () => {
    const selection: ScopeSelection = { flat: { 'optional-scope': false }, repo: {} };
    expect(buildSelectedScopeString(selection)).not.toContain('optional-scope');
  });

  it('includes optional flat scopes the selection enables', () => {
    const selection: ScopeSelection = { flat: { 'optional-scope': true }, repo: {} };
    expect(buildSelectedScopeString(selection)).toContain('optional-scope');
  });

  it('forces requiredActions on repo scopes regardless of selection', () => {
    const selection: ScopeSelection = {
      flat: {},
      repo: { 'app.example.post': { create: false, update: false, delete: false } },
    };
    const result = buildSelectedScopeString(selection);
    // create is a requiredAction -> always present
    expect(result).toContain('repo:app.example.post?action=create');
    // update/delete not selected -> absent
    expect(result).not.toContain('repo:app.example.post?action=update');
    expect(result).not.toContain('repo:app.example.post?action=delete');
  });

  it('includes repo actions the user toggled on', () => {
    const selection: ScopeSelection = {
      flat: {},
      repo: { 'app.example.post': { update: true } },
    };
    const result = buildSelectedScopeString(selection);
    expect(result).toContain('repo:app.example.post?action=create'); // required
    expect(result).toContain('repo:app.example.post?action=update'); // toggled
  });

  it('handles repo collections missing entirely from the selection', () => {
    // app.example.like has no requiredActions and is absent from selection.repo
    const selection: ScopeSelection = { flat: {}, repo: {} };
    const result = buildSelectedScopeString(selection);
    expect(result).not.toContain('repo:app.example.like');
  });

  it('returns a single space-delimited string', () => {
    const result = buildSelectedScopeString({ flat: {}, repo: {} });
    expect(result.split(' ').every((t) => t.length > 0)).toBe(true);
  });
});

describe('defaultScopeSelection', () => {
  it('mirrors defaultEnabled on flat scopes', () => {
    const { flat } = defaultScopeSelection();
    expect(flat['atproto']).toBe(true);
    expect(flat['optional-scope']).toBe(false);
    expect(flat['default-on']).toBe(true);
  });

  it('sets each repo action true iff it is in defaultActions', () => {
    const { repo } = defaultScopeSelection();
    expect(repo['app.example.post']).toEqual({
      create: true,
      update: false,
      delete: false,
    });
    expect(repo['app.example.like']).toEqual({ create: true, delete: true });
  });
});

describe('OAUTH_SCOPE', () => {
  it('is the scope string for the default selection', () => {
    expect(OAUTH_SCOPE).toBe(buildSelectedScopeString(defaultScopeSelection()));
  });
});
