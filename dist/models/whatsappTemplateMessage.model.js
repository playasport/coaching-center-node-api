"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppTemplateMessageModel = void 0;
const mongoose_1 = require("mongoose");
const schema = new mongoose_1.Schema({
    phone: { type: String, required: true, trim: true, index: true },
    templateName: {
        type: String,
        required: true,
        enum: ['payment_request', 'payment_reminder', 'booking_cancelled'],
        index: true,
    },
    waMessageId: { type: String, required: true, unique: true, index: true },
    status: {
        type: String,
        required: true,
        enum: ['sent', 'delivered', 'read', 'failed'],
        default: 'sent',
        index: true,
    },
    metadata: { type: mongoose_1.Schema.Types.Mixed, default: null },
}, { timestamps: true });
schema.index({ createdAt: -1 });
schema.index({ templateName: 1, status: 1 });
schema.index({ phone: 1, createdAt: -1 });
exports.WhatsAppTemplateMessageModel = (0, mongoose_1.model)('WhatsAppTemplateMessage', schema);
//# sourceMappingURL=whatsappTemplateMessage.model.js.map