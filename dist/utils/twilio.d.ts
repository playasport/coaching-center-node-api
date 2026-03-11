import { Twilio } from 'twilio';
/**
 * Get Twilio client with settings priority (Settings first, then ENV fallback)
 */
export declare const getTwilioClient: () => Promise<Twilio | null>;
/**
 * Reset Twilio client (useful when credentials are updated)
 */
export declare const resetTwilioClient: () => void;
//# sourceMappingURL=twilio.d.ts.map