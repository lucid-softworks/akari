describe('tabScrollRegistry', () => {
  afterEach(() => {
    jest.resetModules();
  });

  it('runs registered handler on tab press', () => {
    const module = require('@/utils/tabScrollRegistry');
    const { tabScrollRegistry } = module;
    const handler = jest.fn();
    tabScrollRegistry.register('home', handler);
    tabScrollRegistry.handleTabPress('home');
    expect(handler).toHaveBeenCalled();
  });

  it('ignores unregistered tabs', () => {
    const module = require('@/utils/tabScrollRegistry');
    const { tabScrollRegistry } = module;
    const handler = jest.fn();
    tabScrollRegistry.register('home', handler);
    tabScrollRegistry.handleTabPress('other');
    expect(handler).not.toHaveBeenCalled();
  });
});
