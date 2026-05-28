/**
 * In-process log buffer surfaced by the Settings → About → System log
 * screen. Captures the last ~200 entries from `console.log` / `warn` /
 * `error` so users can copy a snapshot when reporting issues, without
 * dragging in a heavyweight remote logger.
 *
 * The console hook installs once on first import; the original methods
 * stay intact so devtools still see everything.
 */

export type SystemLogLevel = 'log' | 'warn' | 'error' | 'info';

export type SystemLogEntry = {
  ts: number;
  level: SystemLogLevel;
  message: string;
};

const MAX_ENTRIES = 200;
const buffer: SystemLogEntry[] = [];
const listeners = new Set<() => void>();

function safeStringify(value: unknown): string {
  if (value instanceof Error) return value.stack ?? value.message;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function recordEntry(level: SystemLogLevel, args: unknown[]) {
  const message = args.map(safeStringify).join(' ');
  buffer.push({ ts: Date.now(), level, message });
  if (buffer.length > MAX_ENTRIES) buffer.shift();
  for (const l of listeners) l();
}

export function getSystemLog(): readonly SystemLogEntry[] {
  return buffer;
}

export function subscribeSystemLog(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function clearSystemLog() {
  buffer.length = 0;
  for (const l of listeners) l();
}

let installed = false;

/**
 * Wraps `console.{log,info,warn,error}` so each call is also pushed
 * into the ring buffer. Safe to call multiple times — subsequent calls
 * no-op. Originals are preserved so DevTools / Metro still show
 * everything as usual.
 */
export function installSystemLogConsoleHook() {
  if (installed) return;
  installed = true;

  const wrap = (level: SystemLogLevel, orig: (...args: unknown[]) => void) => {
    return (...args: unknown[]) => {
      try {
        recordEntry(level, args);
      } catch {
        // Never let a logger crash the host.
      }
      orig.apply(console, args);
    };
  };

  console.log = wrap('log', console.log);
  console.info = wrap('info', console.info);
  console.warn = wrap('warn', console.warn);
  console.error = wrap('error', console.error);
}

// Self-install on import so callers don't have to remember to wire
// `installSystemLogConsoleHook` somewhere during boot.
installSystemLogConsoleHook();
