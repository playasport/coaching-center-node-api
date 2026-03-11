"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppConversationModel = void 0;
const mongoose_1 = require("mongoose");
const schema = new mongoose_1.Schema({
    phone: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    displayName: { type: String, default: null, trim: true },
    lastMessageAt: { type: Date, required: true, default: Date.now, index: true },
    lastMessagePreview: { type: String, default: null, trim: true },
    lastMessageFromUs: { type: Boolean, default: null },
    unreadCount: { type: Number, default: 0, min: 0 },
}, { timestamps: true });
schema.index({ lastMessageAt: -1 });
exports.WhatsAppConversationModel = (0, mongoose_1.model)('WhatsAppConversation', schema);
//# sourceMappingURL=whatsappConversation.model.js.map