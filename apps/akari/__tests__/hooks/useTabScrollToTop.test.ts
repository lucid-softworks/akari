import { renderHook } from '@testing-library/react-native';
import { useTabScrollToTop } from '@/hooks/useTabScrollToTop';

describe('useTabScrollToTop', () => {
  it('calls scrollToTop when handler is invoked', () => {
    const scrollToTop = jest.fn();
    const { result } = renderHook(() => useTabScrollToTop(scrollToTop));

    result.current();

    expect(scrollToTop).toHaveBeenCalledTimes(1);
  });

  it('returns same handler across re-renders with same function', () => {
    const scrollToTop = jest.fn();
    const { result, rerender } = renderHook(
      ({ fn }) => useTabScrollToTop(fn),
      { initialProps: { fn: scrollToTop } },
    );

    const firstHandler = result.current;
    rerender({ fn: scrollToTop });

    expect(result.current).toBe(firstHandler);
  });

  it('updates handler when scrollToTop changes', () => {
    const initialScrollToTop = jest.fn();
    const { result, rerender } = renderHook(
      ({ fn }) => useTabScrollToTop(fn),
      { initialProps: { fn: initialScrollToTop } },
    );

    const firstHandler = result.current;
    const newScrollToTop = jest.fn();
    rerender({ fn: newScrollToTop });

    expect(result.current).not.toBe(firstHandler);
    result.current();
    expect(newScrollToTop).toHaveBeenCalledTimes(1);
    expect(initialScrollToTop).not.toHaveBeenCalled();
  });

  it('handles undefined scroll function gracefully', () => {
    const { result } = renderHook(() => useTabScrollToTop(undefined as unknown as () => void));

    expect(() => result.current()).not.toThrow();
  });
});
