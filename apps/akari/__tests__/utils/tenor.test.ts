const mockTenorAPI = jest.fn();

jest.mock('@/tenor-api', () => ({
  TenorAPI: mockTenorAPI,
}));

describe('tenor utility', () => {
  const EXPECTED_KEY = 'AIzaSyA497MbJK6lzNQ9VIGvUyxWG6QLzjndJm8';

  beforeEach(() => {
    jest.resetModules();
    mockTenorAPI.mockClear();
  });

  it('creates a TenorAPI instance with the expected API key', () => {
    const module = require('@/utils/tenor');

    expect(mockTenorAPI).toHaveBeenCalledTimes(1);
    expect(mockTenorAPI).toHaveBeenCalledWith(EXPECTED_KEY);
    expect(module.tenorApi).toBe(mockTenorAPI.mock.instances[0]);
  });

  it('reuses the same TenorAPI instance across imports', () => {
    const first = require('@/utils/tenor');
    const second = require('@/utils/tenor');

    expect(mockTenorAPI).toHaveBeenCalledTimes(1);
    expect(first.tenorApi).toBe(mockTenorAPI.mock.instances[0]);
    expect(second.tenorApi).toBe(first.tenorApi);
  });
});
