import { renderHook, act } from '@testing-library/react-native';

import { getRateLimitCooldownUntil } from '@/bluesky-api';
import { useRateLimitWait } from '@/hooks/useRateLimitWait';

jest.mock('@/bluesky-api', () => ({
  getRateLimitCooldownUntil: jest.fn(),
}));

describe('useRateLimitWait', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(0);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns 0 when no pds url is supplied', () => {
    const { result } = renderHook(() => useRateLimitWait(undefined));
    expect(result.current).toBe(0);
    expect(getRateLimitCooldownUntil).not.toHaveBeenCalled();
  });

  it('returns 0 when the client is not rate-limited', () => {
    (getRateLimitCooldownUntil as jest.Mock).mockReturnValue(undefined);
    const { result } = renderHook(() => useRateLimitWait('https://pds.test'));
    expect(result.current).toBe(0);
  });

  it('returns the remaining wait in milliseconds', () => {
    // cooldown until t=5000, now is t=0 -> 5000ms remaining
    (getRateLimitCooldownUntil as jest.Mock).mockReturnValue(5000);
    const { result } = renderHook(() => useRateLimitWait('https://pds.test'));
    expect(result.current).toBe(5000);
  });

  it('never returns a negative wait once the cooldown has passed', () => {
    (getRateLimitCooldownUntil as jest.Mock).mockReturnValue(1000);
    jest.setSystemTime(2000);
    const { result } = renderHook(() => useRateLimitWait('https://pds.test'));
    expect(result.current).toBe(0);
  });

  it('recomputes the remaining wait on each one-second tick', () => {
    (getRateLimitCooldownUntil as jest.Mock).mockReturnValue(10_000);

    const { result } = renderHook(() => useRateLimitWait('https://pds.test'));
    expect(result.current).toBe(10_000);

    // advance the clock 3s; the interval fires and the memo recomputes.
    // advanceTimersByTime also moves the fake Date forward, so now=3000.
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current).toBe(7000);
  });

  it('clears its interval on unmount', () => {
    (getRateLimitCooldownUntil as jest.Mock).mockReturnValue(10_000);
    const clearSpy = jest.spyOn(global, 'clearInterval');

    const { unmount } = renderHook(() => useRateLimitWait('https://pds.test'));
    unmount();

    expect(clearSpy).toHaveBeenCalled();
  });
});
