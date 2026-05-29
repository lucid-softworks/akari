import { renderHook, act } from '@testing-library/react-native';

import { useNotifyAudience } from '@/hooks/useNotifyAudience';

describe('useNotifyAudience', () => {
  it('defaults to "followers" when nothing is stored', () => {
    const { result } = renderHook(() => useNotifyAudience());
    expect(result.current.audience).toBe('followers');
  });

  it('updates the audience and reflects it on subsequent reads', () => {
    const { result } = renderHook(() => useNotifyAudience());

    act(() => {
      result.current.setAudience('mutuals');
    });
    expect(result.current.audience).toBe('mutuals');

    act(() => {
      result.current.setAudience('no-one');
    });
    expect(result.current.audience).toBe('no-one');
  });

  it('notifies every mounted subscriber of a change', () => {
    const a = renderHook(() => useNotifyAudience());
    const b = renderHook(() => useNotifyAudience());

    act(() => {
      a.result.current.setAudience('anyone');
    });

    expect(a.result.current.audience).toBe('anyone');
    expect(b.result.current.audience).toBe('anyone');
  });
});
