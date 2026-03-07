"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppMessageModel = void 0;
const mongoose_1 = require("mongoose");
const schema = new mongoose_1.Schema({
    conversation: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'WhatsAppConversation',
        required: true,
        index: true,
    },
    direction: {
        type: String,
        enum: ['in', 'out'],
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: ['text', 'image', 'audio', 'video', 'document', 'reaction', 'interactive', 'unknown'],
        default: 'text',
    },
    content: { type: String, default: '', trim: true },
    waMessageId: { type: String, required: true, index: true },
    waTimestamp: { type: Number, required: true },
    status: { type: String, default: null },
    mediaUrl: { type: String, default: null },
    repliedToWaMessageId: { type: String, default: null },
    fromAdmin: { type: Boolean, default: false },
    rawPayload: { type: mongoose_1.Schema.Types.Mixed, default: null },
}, { timestamps: true });
schema.index({ conversation: 1, createdAt: -1 });
schema.index({ conversation: 1, waMessageId: 1 }, { unique: true });
exports.WhatsAppMessageModel = (0, mongoose_1.model)('WhatsAppMessage', schema);
//# sourceMappingURL=whatsappMessage.model.js.map