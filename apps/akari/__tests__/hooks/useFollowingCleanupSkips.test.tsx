import { act, renderHook } from '@testing-library/react-native';
import { MMKV } from 'react-native-mmkv';

import { useFollowingCleanupSkips } from '@/hooks/useFollowingCleanupSkips';

describe('useFollowingCleanupSkips', () => {
  it('falls back to an empty set when stored value is not valid JSON', () => {
    const storage = new MMKV({ id: 'following-cleanup-skips' });
    storage.set('skips:did:plc:badjson', 'not-json{');
    const { result } = renderHook(() => useFollowingCleanupSkips('did:plc:badjson'));
    expect(result.current.skipped.size).toBe(0);
  });

  it('falls back to an empty set when stored value is not an array', () => {
    const storage = new MMKV({ id: 'following-cleanup-skips' });
    storage.set('skips:did:plc:notarray', JSON.stringify({ foo: 'bar' }));
    const { result } = renderHook(() => useFollowingCleanupSkips('did:plc:notarray'));
    expect(result.current.skipped.size).toBe(0);
  });

  it('reads a previously-persisted array and filters non-strings', () => {
    const storage = new MMKV({ id: 'following-cleanup-skips' });
    storage.set('skips:did:plc:persisted', JSON.stringify(['did:plc:keep', 42, null]));
    const { result } = renderHook(() => useFollowingCleanupSkips('did:plc:persisted'));
    expect(result.current.skipped.has('did:plc:keep')).toBe(true);
    expect(result.current.skipped.size).toBe(1);
  });

  it('returns an empty set and no-ops when accountDid is undefined', () => {
    const { result } = renderHook(() => useFollowingCleanupSkips(undefined));
    expect(result.current.skipped.size).toBe(0);

    act(() => {
      result.current.skip('did:plc:x');
      result.current.unskip('did:plc:x');
      result.current.clearAll();
    });
    expect(result.current.skipped.size).toBe(0);
  });

  it('adds a did via skip and reflects it reactively', () => {
    const { result } = renderHook(() => useFollowingCleanupSkips('did:plc:alpha'));
    expect(result.current.skipped.has('did:plc:1')).toBe(false);

    act(() => {
      result.current.skip('did:plc:1');
    });
    expect(result.current.skipped.has('did:plc:1')).toBe(true);
  });

  it('does not duplicate or re-notify when skipping an already-skipped did', () => {
    const { result } = renderHook(() => useFollowingCleanupSkips('did:plc:beta'));
    act(() => {
      result.current.skip('did:plc:dup');
    });
    const first = result.current.skipped;
    act(() => {
      result.current.skip('did:plc:dup');
    });
    expect(result.current.skipped).toBe(first);
    expect(result.current.skipped.size).toBe(1);
  });

  it('removes a did via unskip', () => {
    const { result } = renderHook(() => useFollowingCleanupSkips('did:plc:gamma'));
    act(() => {
      result.current.skip('did:plc:a');
      result.current.skip('did:plc:b');
    });
    expect(result.current.skipped.size).toBe(2);

    act(() => {
      result.current.unskip('did:plc:a');
    });
    expect(result.current.skipped.has('did:plc:a')).toBe(false);
    expect(result.current.skipped.has('did:plc:b')).toBe(true);
  });

  it('unskip of an absent did does not notify or change state', () => {
    const { result } = renderHook(() => useFollowingCleanupSkips('did:plc:delta'));
    act(() => {
      result.current.skip('did:plc:present');
    });
    const snapshot = result.current.skipped;
    act(() => {
      result.current.unskip('did:plc:absent');
    });
    expect(result.current.skipped).toBe(snapshot);
  });

  it('clearAll empties the skip set', () => {
    const { result } = renderHook(() => useFollowingCleanupSkips('did:plc:epsilon'));
    act(() => {
      result.current.skip('did:plc:a');
      result.current.skip('did:plc:b');
    });
    expect(result.current.skipped.size).toBe(2);

    act(() => {
      result.current.clearAll();
    });
    expect(result.current.skipped.size).toBe(0);
  });

  it('keeps skip lists isolated per account', () => {
    const a = renderHook(() => useFollowingCleanupSkips('did:plc:acctA'));
    const b = renderHook(() => useFollowingCleanupSkips('did:plc:acctB'));

    act(() => {
      a.result.current.skip('did:plc:shared');
    });
    expect(a.result.current.skipped.has('did:plc:shared')).toBe(true);
    expect(b.result.current.skipped.has('did:plc:shared')).toBe(false);
  });
});
