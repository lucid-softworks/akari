import { isCardPressSuppressed, suppressCardPress } from '@/utils/postCardPressGuard';

describe('postCardPressGuard', () => {
  beforeEach(() => {
    // jest.setup enables fake timers globally; pin the clock so Date.now()
    // is deterministic across the suppression-window arithmetic.
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-29T00:00:00.000Z'));
  });

  it('is not suppressed by default', () => {
    expect(isCardPressSuppressed()).toBe(false);
  });

  it('suppresses the card press immediately after onPressIn', () => {
    suppressCardPress();
    expect(isCardPressSuppressed()).toBe(true);
  });

  it('stays suppressed within the 350ms window', () => {
    suppressCardPress();
    jest.advanceTimersByTime(349);
    expect(isCardPressSuppressed()).toBe(true);
  });

  it('clears suppression once the window elapses', () => {
    suppressCardPress();
    jest.advanceTimersByTime(351);
    expect(isCardPressSuppressed()).toBe(false);
  });

  it('re-arms the window on a subsequent press', () => {
    suppressCardPress();
    jest.advanceTimersByTime(351);
    expect(isCardPressSuppressed()).toBe(false);
    suppressCardPress();
    expect(isCardPressSuppressed()).toBe(true);
  });
});
