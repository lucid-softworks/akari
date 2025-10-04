import { Expo, type ExpoPushMessage, type ExpoPushTicket } from 'expo-server-sdk';
import { logger } from './logger.js';
import type { NotificationMessage, Subscription } from './types.js';

export class ExpoNotifier {
  private readonly expo: Expo;

  constructor(accessToken?: string) {
    this.expo = new Expo({ accessToken });
  }

  async send(subscription: Subscription, message: NotificationMessage): Promise<void> {
    const validTokens = subscription.tokens.filter((token) => {
      const isValid = Expo.isExpoPushToken(token);
      if (!isValid) {
        logger.warn('Skipping invalid Expo push token.', { token, did: subscription.did });
      }
      return isValid;
    });

    if (validTokens.length === 0) {
      logger.warn('No valid Expo push tokens available for subscription.', { did: subscription.did });
      return;
    }

    const payloads: ExpoPushMessage[] = validTokens.map((token) => ({
      to: token,
      sound: 'default',
      title: message.title,
      body: message.body,
      data: message.data,
    }));

    const chunks = this.expo.chunkPushNotifications(payloads);

    for (const chunk of chunks) {
      try {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        this.logTickets(tickets, chunk, subscription);
      } catch (error) {
        logger.error('Failed to send Expo push notification chunk.', {
          error: error instanceof Error ? error.message : error,
          did: subscription.did,
        });
      }
    }
  }

  private logTickets(tickets: ExpoPushTicket[], messages: ExpoPushMessage[], subscription: Subscription) {
    tickets.forEach((ticket, index) => {
      if (ticket.status === 'ok') {
        logger.info('Delivered Expo push notification.', {
          did: subscription.did,
          ticketId: ticket.id,
        });
        return;
      }

      logger.error('Expo push notification failed.', {
        did: subscription.did,
        token: messages[index]?.to,
        message: ticket.message,
        details: ticket.details,
      });
    });
  }
}
