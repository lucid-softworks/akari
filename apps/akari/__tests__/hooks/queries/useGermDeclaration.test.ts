import { germButtonVisibleFor } from '@/hooks/queries/useGermDeclaration';

describe('germButtonVisibleFor', () => {
  it('shows when audience is unset (treat as everyone)', () => {
    expect(germButtonVisibleFor(undefined, false, false)).toBe(true);
  });

  it.each(['everyone', 'all', 'anyone'])(
    'shows for "%s" regardless of follow relationship',
    (audience) => {
      expect(germButtonVisibleFor(audience, false, false)).toBe(true);
    },
  );

  it('shows for "usersIFollow" only when target follows the viewer', () => {
    expect(germButtonVisibleFor('usersIFollow', true, false)).toBe(true);
    expect(germButtonVisibleFor('usersIFollow', false, true)).toBe(false);
    expect(germButtonVisibleFor('usersIFollow', false, false)).toBe(false);
  });

  it('shows for "mutuals" only when both directions follow', () => {
    expect(germButtonVisibleFor('mutuals', true, true)).toBe(true);
    expect(germButtonVisibleFor('mutuals', true, false)).toBe(false);
    expect(germButtonVisibleFor('mutuals', false, true)).toBe(false);
  });

  it.each(['none', 'noOne'])('hides for explicit opt-out "%s"', (audience) => {
    expect(germButtonVisibleFor(audience, true, true)).toBe(false);
  });

  it('hides for unknown audience values (conservative default)', () => {
    expect(germButtonVisibleFor('aliensOnly', true, true)).toBe(false);
  });
});
