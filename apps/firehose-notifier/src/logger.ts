const LEVELS = ['debug', 'info', 'warn', 'error'] as const;

export type LogLevel = (typeof LEVELS)[number];

const levelWeights: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const minLevel = (() => {
  const level = process.env.AKARI_NOTIFIER_LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
  return level && LEVELS.includes(level) ? level : 'info';
})();

function timestamp(): string {
  return new Date().toISOString();
}

export const logger = {
  debug(message: string, metadata?: unknown) {
    if (levelWeights[minLevel] > levelWeights.debug) return;
    console.debug(`[${timestamp()}] [debug] ${message}`, metadata ?? '');
  },
  info(message: string, metadata?: unknown) {
    if (levelWeights[minLevel] > levelWeights.info) return;
    console.info(`[${timestamp()}] [info] ${message}`, metadata ?? '');
  },
  warn(message: string, metadata?: unknown) {
    if (levelWeights[minLevel] > levelWeights.warn) return;
    console.warn(`[${timestamp()}] [warn] ${message}`, metadata ?? '');
  },
  error(message: string, metadata?: unknown) {
    if (levelWeights[minLevel] > levelWeights.error) return;
    console.error(`[${timestamp()}] [error] ${message}`, metadata ?? '');
  },
};
