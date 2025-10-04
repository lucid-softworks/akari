import { loadConfig } from './config.js';
import { FirehoseNotifier } from './firehose.js';
import { logger } from './logger.js';
import { ExpoNotifier } from './notifier.js';
import { SubscriptionStore } from './subscription-store.js';

let service: FirehoseNotifier | null = null;
let subscriptionStore: SubscriptionStore | null = null;

function registerShutdownHandlers() {
  const handleShutdown = (signal: NodeJS.Signals) => {
    logger.info(`Received ${signal}, shutting down firehose watcher.`);
    service?.stop();
    subscriptionStore?.stop();
    process.exit(0);
  };

  process.once('SIGINT', handleShutdown);
  process.once('SIGTERM', handleShutdown);
}

async function main() {
  try {
    const config = loadConfig();
    const expoNotifier = new ExpoNotifier(config.expoAccessToken);
    subscriptionStore = new SubscriptionStore(config.registry);
    await subscriptionStore.start();
    service = new FirehoseNotifier(expoNotifier, subscriptionStore);
    service.start();
    registerShutdownHandlers();
  } catch (error) {
    logger.error('Failed to start firehose notifier.', {
      error: error instanceof Error ? error.message : error,
    });
    process.exit(1);
  }
}

void main();
