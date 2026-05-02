// Explicitly import the non-iOS variant; jest-expo's preset resolves
// `@/components/ui/TabBarBackground` to `.ios.tsx` by default.
// The .ios.tsx behavior is covered by TabBarBackground.ios.test.tsx.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mod = require('../../components/ui/TabBarBackground.tsx');
const TabBarBackground = mod.default;
const useBottomTabOverflow = mod.useBottomTabOverflow;

describe('TabBarBackground', () => {
  it('default export is undefined on non-iOS platforms', () => {
    expect(TabBarBackground).toBeUndefined();
  });

  it('useBottomTabOverflow returns 0', () => {
    expect(useBottomTabOverflow()).toBe(0);
  });
});
