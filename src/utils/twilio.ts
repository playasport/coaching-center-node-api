import twilio, { Twilio } from 'twilio';
import { config } from '../config/env';
import { logger } from './logger';

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
        logger.warn('Twilio credentials missing from settings, checking env fallback', {
          hasAccountSid: !!credentials.accountSid,
          hasAuthToken: !!credentials.authToken,
          hasFromPhone: !!credentials.fromPhone,
        });
        
        // Fallback to env if settings credentials are missing
        if (!config.twilio.accountSid || !config.twilio.authToken || !config.twilio.fromPhone) {
          logger.error('Twilio credentials missing from both settings and environment variables');
          return null;
        }

        // Trim credentials to remove any whitespace
        const accountSid = config.twilio.accountSid.trim();
        const authToken = config.twilio.authToken.trim();
        
        client = twilio(accountSid, authToken);
        logger.info('Twilio client initialized with environment credentials');
        return client;
      }

      // Trim credentials to remove any whitespace
      const accountSid = credentials.accountSid.trim();
      const authToken = credentials.authToken.trim();
      
      client = twilio(accountSid, authToken);
      logger.info('Twilio client initialized with settings credentials', {
        accountSidLength: accountSid.length,
        authTokenLength: authToken.length,
      });
      return client;
    } catch (error) {
      logger.error('Failed to initialize Twilio client from settings, trying env fallback', error);
      
      // Fallback to env if settings fail
      if (!config.twilio.accountSid || !config.twilio.authToken || !config.twilio.fromPhone) {
        logger.error('Twilio credentials missing from environment variables');
        return null;
      }

      // Trim credentials to remove any whitespace
      const accountSid = config.twilio.accountSid.trim();
      const authToken = config.twilio.authToken.trim();
      
      client = twilio(accountSid, authToken);
      logger.info('Twilio client initialized with environment credentials (after settings error)');
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

