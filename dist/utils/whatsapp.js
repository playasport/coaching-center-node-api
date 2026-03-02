"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWhatsApp = void 0;
const twilio_1 = require("./twilio");
const env_1 = require("../config/env");
const logger_1 = require("./logger");
const settings_service_1 = require("../services/common/settings.service");
const sendWhatsApp = async (options) => {
    const client = await (0, twilio_1.getTwilioClient)();
    if (!client) {
        logger_1.logger.info('WhatsApp mocked send', options);
        return { success: false, error: 'Twilio client not available' };
    }
    // Get from phone number from settings first, then env
    const credentials = await (0, settings_service_1.getSmsCredentials)();
    const fromPhone = credentials.fromPhone || env_1.config.twilio.fromPhone;
    // Twilio WhatsApp uses 'whatsapp:' prefix for phone numbers
    const fromNumber = fromPhone?.startsWith('whatsapp:')
        ? fromPhone
        : `whatsapp:${fromPhone}`;
    const toNumber = options.to.startsWith('whatsapp:') ? options.to : `whatsapp:${options.to}`;
    try {
        const message = await client.messages.create({
            body: options.body,
            from: fromNumber,
            to: toNumber,
        });
        logger_1.logger.info('WhatsApp message sent successfully', {
            messageId: message.sid,
            to: options.to,
        });
        return { success: true, messageId: message.sid };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error('WhatsApp delivery failed', {
            error: errorMessage,
            to: options.to,
        });
        // Check if it's a retryable error
        const retryable = !errorMessage.includes('invalid') && !errorMessage.includes('unsubscribed');
        return {
            success: false,
            error: errorMessage,
            retryable,
        };
    }
};
exports.sendWhatsApp = sendWhatsApp;
//# sourceMappingURL=whatsapp.js.map