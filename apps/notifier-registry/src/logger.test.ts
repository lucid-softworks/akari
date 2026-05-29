import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// minLevel is computed once at module-evaluation time from the env var, so we
// re-import the module under jest.isolateModulesAsync after mutating the env.
async function loadLogger(level?: string) {
  const saved = process.env.AKARI_REGISTRY_LOG_LEVEL;
  if (level === undefined) {
    delete process.env.AKARI_REGISTRY_LOG_LEVEL;
  } else {
    process.env.AKARI_REGISTRY_LOG_LEVEL = level;
  }

  let mod!: typeof import('./logger.js');
  await jest.isolateModulesAsync(async () => {
    mod = await import('./logger.js');
  });

  if (saved === undefined) {
    delete process.env.AKARI_REGISTRY_LOG_LEVEL;
  } else {
    process.env.AKARI_REGISTRY_LOG_LEVEL = saved;
  }
  return mod.logger;
}

let debugSpy: ReturnType<typeof jest.spyOn>;
let infoSpy: ReturnType<typeof jest.spyOn>;
let warnSpy: ReturnType<typeof jest.spyOn>;
let errorSpy: ReturnType<typeof jest.spyOn>;

beforeEach(() => {
  debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
  infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('logger at default (info) level', () => {
  it('suppresses debug but emits info, warn, and error', async () => {
    const logger = await loadLogger();
    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('includes the level tag and message in the output', async () => {
    const logger = await loadLogger();
    logger.info('hello', { a: 1 });
    const firstArg = infoSpy.mock.calls[0][0] as string;
    expect(firstArg).toContain('[info]');
    expect(firstArg).toContain('hello');
    expect(infoSpy.mock.calls[0][1]).toEqual({ a: 1 });
  });

  it('passes an empty string when no metadata is provided', async () => {
    const logger = await loadLogger();
    logger.error('oops');
    expect(errorSpy.mock.calls[0][1]).toBe('');
  });
});

describe('logger at debug level', () => {
  it('emits all levels', async () => {
    const logger = await loadLogger('debug');
    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');
    expect(debugSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});

describe('logger at error level', () => {
  it('suppresses everything below error', async () => {
    const logger = await loadLogger('error');
    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');
    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});

describe('logger with an invalid level', () => {
  it('falls back to info', async () => {
    const logger = await loadLogger('verbose-nonsense');
    logger.debug('d');
    logger.info('i');
    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledTimes(1);
  });

  it('lowercases the configured level', async () => {
    const logger = await loadLogger('WARN');
    logger.info('i');
    logger.warn('w');
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
