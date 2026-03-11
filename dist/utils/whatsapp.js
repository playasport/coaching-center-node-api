"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWhatsApp = void 0;
const logger_1 = require("./logger");
const settings_service_1 = require("../services/common/settings.service");
const metaWhatsApp_service_1 = require("../services/common/metaWhatsApp.service");
/**
 * Send WhatsApp message via Meta Cloud API only (config from Settings or env).
 * Strips optional "whatsapp:" prefix from recipient.
 */
const sendWhatsApp = async (options) => {
    const cfg = await (0, settings_service_1.getWhatsAppCloudConfig)();
    if (!cfg.enabled || !cfg.phoneNumberId || !cfg.accessToken) {
        logger_1.logger.info('WhatsApp Cloud not configured or disabled', { to: options.to });
        return { success: false, error: 'WhatsApp Cloud API is not configured or disabled' };
    }
    const to = (options.to || '').replace(/^whatsapp:/i, '').trim();
    if (!to) {
        return { success: false, error: 'Missing recipient' };
    }
    try {
        const { messageId } = await (0, metaWhatsApp_service_1.sendWhatsAppCloudText)(to, options.body);
        logger_1.logger.info('WhatsApp message sent successfully', { messageId, to: options.to });
        return { success: true, messageId };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.logger.error('WhatsApp delivery failed', { error: errorMessage, to: options.to });
        const retryable = !errorMessage.includes('invalid') &&
            !errorMessage.includes('unsubscribed') &&
            !errorMessage.includes('not configured');
        return {
            success: false,
            error: errorMessage,
            retryable,
        };
    }
};
exports.sendWhatsApp = sendWhatsApp;
//# sourceMappingURL=whatsapp.js.map