describe('tabScrollRegistry', () => {
  afterEach(() => {
    jest.resetModules();
  });

  it('runs registered scroll handlers', () => {
    const module = require('@/utils/tabScrollRegistry');
    const { tabScrollRegistry } = module;

    const scrollToTop = jest.fn();
    const scrollBy = jest.fn();
    const containsTarget = jest.fn(() => true);

    tabScrollRegistry.register('home', { scrollToTop, scrollBy, containsTarget });

    tabScrollRegistry.handleTabPress('home');
    expect(scrollToTop).toHaveBeenCalledTimes(1);

    tabScrollRegistry.scrollBy('home', 120);
    expect(scrollBy).toHaveBeenCalledWith(120);

    expect(tabScrollRegistry.isEventWithinScrollArea('home', null)).toBe(true);
  });

  it('ignores unregistered tabs', () => {
    const module = require('@/utils/tabScrollRegistry');
    const { tabScrollRegistry } = module;

    const scrollToTop = jest.fn();
    tabScrollRegistry.register('home', { scrollToTop });
    tabScrollRegistry.handleTabPress('other');
    expect(scrollToTop).not.toHaveBeenCalled();

    tabScrollRegistry.scrollBy('other', 10);
    expect(tabScrollRegistry.isEventWithinScrollArea('other', null)).toBe(false);
  });
});
