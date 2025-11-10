import twilio, { Twilio } from 'twilio';
import { config } from '../config/env';

let client: Twilio | null = null;

export const getTwilioClient = (): Twilio | null => {
  if (!config.twilio.accountSid || !config.twilio.authToken || !config.twilio.fromPhone) {
    return null;
  }

  if (!client) {
    client = twilio(config.twilio.accountSid, config.twilio.authToken);
  }

  return client;
};

