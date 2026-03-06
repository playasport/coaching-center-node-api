"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRazorpayWebhook = exports.handleWhatsAppWebhook = exports.handleWhatsAppWebhookVerify = void 0;
const logger_1 = require("../utils/logger");
const webhookService = __importStar(require("../services/common/webhook.service"));
const settings_service_1 = require("../services/common/settings.service");
const metaWhatsApp_service_1 = require("../services/common/metaWhatsApp.service");
/**
 * WhatsApp Cloud API webhook verification (GET)
 * Meta sends hub.mode=subscribe, hub.verify_token=YOUR_TOKEN, hub.challenge=RANDOM
 */
const handleWhatsAppWebhookVerify = async (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const cfg = await (0, settings_service_1.getWhatsAppCloudConfig)();
    const result = (0, metaWhatsApp_service_1.verifyWhatsAppWebhook)(mode, token, challenge, cfg.webhookVerifyToken);
    if (result === null) {
        res.status(403).send('Forbidden');
        return;
    }
    res.status(200).send(result);
};
exports.handleWhatsAppWebhookVerify = handleWhatsAppWebhookVerify;
/**
 * WhatsApp Cloud API webhook (POST) - incoming messages
 */
const handleWhatsAppWebhook = async (req, res) => {
    try {
        const signature = req.headers['x-hub-signature-256'];
        const rawBody = req.rawBody;
        const cfg = await (0, settings_service_1.getWhatsAppCloudConfig)();
        if (rawBody && signature && cfg.appSecret) {
            const valid = (0, metaWhatsApp_service_1.verifyWhatsAppWebhookSignature)(rawBody, signature, cfg.appSecret);
            if (!valid) {
                logger_1.logger.warn('WhatsApp webhook invalid signature');
                res.status(401).send('Invalid signature');
                return;
            }
        }
        const payload = req.body;
        if (payload?.object === 'whatsapp_business_account') {
            (0, metaWhatsApp_service_1.processWhatsAppWebhookPayload)(payload).catch((err) => {
                logger_1.logger.error('WhatsApp webhook process error', { error: err });
            });
        }
        res.status(200).send('OK');
    }
    catch (error) {
        logger_1.logger.error('WhatsApp webhook handler error', { error });
        res.status(200).send('OK');
    }
};
exports.handleWhatsAppWebhook = handleWhatsAppWebhook;
/**
 * Handle Razorpay webhook
 */
const handleRazorpayWebhook = async (req, res) => {
    try {
        const payload = req.body;
        // Verify it's a Razorpay webhook
        if (!payload.event || !payload.payload) {
            logger_1.logger.warn('Invalid webhook payload structure', { payload });
            res.status(400).json({ error: 'Invalid webhook payload' });
            return;
        }
        // Process webhook asynchronously (don't wait for it to complete)
        webhookService.handleWebhook(payload).catch((error) => {
            logger_1.logger.error('Error processing webhook asynchronously:', {
                error: error instanceof Error ? error.message : error,
                event: payload.event,
            });
        });
        // Respond immediately to Razorpay
        res.status(200).json({ received: true });
    }
    catch (error) {
        logger_1.logger.error('Webhook handler error:', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
        });
        // Still respond 200 to Razorpay to prevent retries
        res.status(200).json({ received: true, error: 'Processing error' });
    }
};
exports.handleRazorpayWebhook = handleRazorpayWebhook;
//# sourceMappingURL=webhook.controller.js.map