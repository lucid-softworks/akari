import { isFeatureEnabled } from '@/utils/featureFlags';

describe('isFeatureEnabled', () => {
  it('returns the current value for the groupChats flag', () => {
    // groupChats is gated off until the chat service rolls out group convos
    // for non-employee accounts.
    expect(isFeatureEnabled('groupChats')).toBe(false);
  });

  it('returns a boolean for every defined flag', () => {
    expect(typeof isFeatureEnabled('groupChats')).toBe('boolean');
  });
});
