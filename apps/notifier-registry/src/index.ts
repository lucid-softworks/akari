import { loadConfig } from './config.js';
import { logger } from './logger.js';
import { createRegistryServer } from './server.js';
import { SubscriptionStore } from './subscription-store.js';

async function main(): Promise<void> {
  try {
    const config = loadConfig();
    const store = new SubscriptionStore(config.dataFile);
    await store.load();

    const server = createRegistryServer(config, store);
    server.listen(config.port, config.host, () => {
      logger.info('Notifier registry listening.', { host: config.host, port: config.port });
    });

    const shutdown = (signal: NodeJS.Signals) => {
      logger.info(`Received ${signal}, shutting down notifier registry.`);
      server.close(() => {
        process.exit(0);
      });
    };

    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  } catch (error) {
    logger.error('Failed to start notifier registry.', {
      error: error instanceof Error ? error.message : error,
    });
    process.exit(1);
  }
}

void main();
