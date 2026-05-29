const mockBlueskyOzoneCtor = jest.fn();

jest.mock('bluesky-ozone', () => ({
  BlueskyOzone: jest.fn((...args: unknown[]) => {
    mockBlueskyOzoneCtor(...args);
    return { args };
  }),
}));

import { DEFAULT_OZONE_DID, ozoneForAccount } from '@/utils/blueskyOzone';

describe('ozoneForAccount', () => {
  beforeEach(() => {
    mockBlueskyOzoneCtor.mockClear();
  });

  it('constructs a client rooted at the account pdsUrl with a null appview did', () => {
    const client = ozoneForAccount({ pdsUrl: 'https://pds.example.com' });
    expect(mockBlueskyOzoneCtor).toHaveBeenCalledWith('https://pds.example.com', null);
    expect(client).toBeDefined();
  });

  it('throws when the account has no pdsUrl', () => {
    expect(() => ozoneForAccount({ pdsUrl: '' })).toThrow(/missing pdsUrl/);
    expect(() =>
      ozoneForAccount({ pdsUrl: undefined as unknown as string }),
    ).toThrow(/missing pdsUrl/);
    expect(mockBlueskyOzoneCtor).not.toHaveBeenCalled();
  });
});

describe('DEFAULT_OZONE_DID', () => {
  it('points at the official Bluesky moderation service', () => {
    expect(DEFAULT_OZONE_DID).toBe('did:plc:ar7c4by46qjdydhdevvrndac');
  });
});
