import {
  clearSystemLog,
  getSystemLog,
  installSystemLogConsoleHook,
  recordEntry,
  subscribeSystemLog,
} from '@/utils/systemLog';

describe('systemLog', () => {
  beforeEach(() => {
    clearSystemLog();
  });

  describe('recordEntry', () => {
    it('appends an entry with level, message, and timestamp', () => {
      const before = Date.now();
      recordEntry('log', ['hello', 'world']);
      const log = getSystemLog();
      expect(log).toHaveLength(1);
      expect(log[0].level).toBe('log');
      expect(log[0].message).toBe('hello world');
      expect(log[0].ts).toBeGreaterThanOrEqual(before);
    });

    it('serializes Error instances to their stack or message', () => {
      const withStack = new Error('boom');
      recordEntry('error', [withStack]);
      expect(getSystemLog()[0].message).toBe(withStack.stack);
    });

    it('falls back to the error message when no stack is present', () => {
      const noStack = new Error('no stack');
      noStack.stack = undefined;
      recordEntry('error', [noStack]);
      expect(getSystemLog()[0].message).toBe('no stack');
    });

    it('JSON-stringifies plain objects', () => {
      recordEntry('info', [{ a: 1 }, 42]);
      expect(getSystemLog()[0].message).toBe('{"a":1} 42');
    });

    it('falls back to String() for non-serializable values', () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;
      recordEntry('warn', [circular]);
      expect(getSystemLog()[0].message).toBe('[object Object]');
    });

    it('trims the buffer to the max capacity (200)', () => {
      for (let i = 0; i < 250; i++) {
        recordEntry('log', [`entry-${i}`]);
      }
      const log = getSystemLog();
      expect(log).toHaveLength(200);
      // Oldest entries shifted out; the first remaining is entry-50.
      expect(log[0].message).toBe('entry-50');
      expect(log[log.length - 1].message).toBe('entry-249');
    });

    it('notifies subscribers on each record', () => {
      const listener = jest.fn();
      subscribeSystemLog(listener);
      recordEntry('log', ['a']);
      recordEntry('log', ['b']);
      expect(listener).toHaveBeenCalledTimes(2);
    });
  });

  describe('subscribeSystemLog', () => {
    it('returns an unsubscribe function that stops notifications', () => {
      const listener = jest.fn();
      const unsubscribe = subscribeSystemLog(listener);
      recordEntry('log', ['first']);
      unsubscribe();
      recordEntry('log', ['second']);
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearSystemLog', () => {
    it('empties the buffer and notifies subscribers', () => {
      recordEntry('log', ['x']);
      const listener = jest.fn();
      subscribeSystemLog(listener);
      clearSystemLog();
      expect(getSystemLog()).toHaveLength(0);
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('installSystemLogConsoleHook', () => {
    it('captures console.log/info/warn/error into the buffer', () => {
      // The hook self-installs on import; calling again is a no-op.
      installSystemLogConsoleHook();

      console.log('captured-log');
      console.info('captured-info');
      console.warn('captured-warn');
      console.error('captured-error');

      const messages = getSystemLog().map((e) => `${e.level}:${e.message}`);
      expect(messages).toContain('log:captured-log');
      expect(messages).toContain('info:captured-info');
      expect(messages).toContain('warn:captured-warn');
      expect(messages).toContain('error:captured-error');
    });

    it('is idempotent across multiple installs', () => {
      installSystemLogConsoleHook();
      installSystemLogConsoleHook();
      clearSystemLog();
      console.log('once');
      // Should only record a single entry, not double-wrapped.
      const entries = getSystemLog().filter((e) => e.message === 'once');
      expect(entries).toHaveLength(1);
    });
  });
});
