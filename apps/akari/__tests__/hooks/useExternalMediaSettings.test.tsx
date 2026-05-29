import { renderHook, act } from '@testing-library/react-native';

import { useExternalMediaSettings } from '@/hooks/useExternalMediaSettings';

describe('useExternalMediaSettings', () => {
  it('defaults both providers to enabled', () => {
    const { result } = renderHook(() => useExternalMediaSettings());
    expect(result.current.youtubeEnabled).toBe(true);
    expect(result.current.gifEnabled).toBe(true);
  });

  it('toggles the youtube provider', () => {
    const { result } = renderHook(() => useExternalMediaSettings());

    act(() => {
      result.current.setYoutubeEnabled(false);
    });
    expect(result.current.youtubeEnabled).toBe(false);
    // gif is untouched
    expect(result.current.gifEnabled).toBe(true);

    act(() => {
      result.current.setYoutubeEnabled(true);
    });
    expect(result.current.youtubeEnabled).toBe(true);
  });

  it('toggles the gif provider independently', () => {
    const { result } = renderHook(() => useExternalMediaSettings());

    act(() => {
      result.current.setGifEnabled(false);
    });
    expect(result.current.gifEnabled).toBe(false);
    expect(result.current.youtubeEnabled).toBe(true);
  });

  it('propagates changes to other mounted consumers', () => {
    const a = renderHook(() => useExternalMediaSettings());
    const b = renderHook(() => useExternalMediaSettings());

    act(() => {
      a.result.current.setGifEnabled(false);
    });

    expect(a.result.current.gifEnabled).toBe(false);
    expect(b.result.current.gifEnabled).toBe(false);
  });
});
