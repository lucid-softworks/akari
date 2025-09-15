import TabBarBackground, {
  useBottomTabOverflow,
} from '@/components/ui/TabBarBackground.tsx';

describe('TabBarBackground', () => {
  it('default export is undefined on non-iOS platforms', () => {
    expect(TabBarBackground).toBeUndefined();
  });

  it('useBottomTabOverflow returns 0', () => {
    expect(useBottomTabOverflow()).toBe(0);
  });
});
