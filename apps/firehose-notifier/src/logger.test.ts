import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

const ORIGINAL_LEVEL = process.env.AKARI_NOTIFIER_LOG_LEVEL;

async function loadLogger(level?: string) {
  jest.resetModules();
  if (level === undefined) {
    delete process.env.AKARI_NOTIFIER_LOG_LEVEL;
  } else {
    process.env.AKARI_NOTIFIER_LOG_LEVEL = level;
  }
  const mod = await import('./logger.js');
  return mod.logger;
}

describe('logger', () => {
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
    if (ORIGINAL_LEVEL === undefined) {
      delete process.env.AKARI_NOTIFIER_LOG_LEVEL;
    } else {
      process.env.AKARI_NOTIFIER_LOG_LEVEL = ORIGINAL_LEVEL;
    }
  });

  it('defaults to info level (debug suppressed, info+ emitted)', async () => {
    const logger = await loadLogger(undefined);
    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('emits debug when level is debug', async () => {
    const logger = await loadLogger('debug');
    logger.debug('d');
    expect(debugSpy).toHaveBeenCalledTimes(1);
  });

  it('suppresses info/warn when level is error', async () => {
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

  it('falls back to info for an invalid level value', async () => {
    const logger = await loadLogger('not-a-level');
    logger.debug('d');
    logger.info('i');
    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledTimes(1);
  });

  it('passes the metadata argument through when provided', async () => {
    const logger = await loadLogger('debug');
    const meta = { foo: 'bar' };
    logger.info('msg', meta);
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('[info] msg'), meta);
  });

  it("passes '' as the metadata placeholder when omitted", async () => {
    const logger = await loadLogger('debug');
    logger.warn('msg');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[warn] msg'), '');
  });
});
