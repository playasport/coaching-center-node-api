import twilio, { Twilio } from 'twilio';
import { config } from '../config/env';

let client: Twilio | null = null;
let clientInitializationPromise: Promise<Twilio | null> | null = null;

/**
 * Get Twilio client with settings priority (Settings first, then ENV fallback)
 */
export const getTwilioClient = async (): Promise<Twilio | null> => {
  // If client already exists, return it
  if (client) {
    return client;
  }

  // If initialization is in progress, wait for it
  if (clientInitializationPromise) {
    return clientInitializationPromise;
  }

  // Initialize client with settings priority
  clientInitializationPromise = (async (): Promise<Twilio | null> => {
    try {
      const { getSmsCredentials } = await import('../services/common/settings.service');
      const credentials = await getSmsCredentials();

      if (!credentials.accountSid || !credentials.authToken || !credentials.fromPhone) {
        return null;
      }

      client = twilio(credentials.accountSid, credentials.authToken);
      return client;
    } catch (error) {
      // Fallback to env if settings fail
      if (!config.twilio.accountSid || !config.twilio.authToken || !config.twilio.fromPhone) {
        return null;
      }

      client = twilio(config.twilio.accountSid, config.twilio.authToken);
      return client;
    } finally {
      clientInitializationPromise = null;
    }
  })();

  return clientInitializationPromise;
};

/**
 * Reset Twilio client (useful when credentials are updated)
 */
export const resetTwilioClient = (): void => {
  client = null;
  clientInitializationPromise = null;
};

