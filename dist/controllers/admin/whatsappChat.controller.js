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
exports.markConversationRead = exports.sendMessage = exports.getConversationMessages = exports.listConversations = void 0;
const ApiResponse_1 = require("../../utils/ApiResponse");
const whatsappChatService = __importStar(require("../../services/admin/whatsappChat.service"));
const listConversations = async (req, res, next) => {
    try {
        const query = req.query;
        const result = await whatsappChatService.listConversations({
            page: query.page,
            limit: query.limit,
            search: query.search,
        });
        const response = new ApiResponse_1.ApiResponse(200, result, 'Conversations retrieved');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.listConversations = listConversations;
const getConversationMessages = async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        const query = req.query;
        const result = await whatsappChatService.getConversationMessages(conversationId, {
            page: query.page,
            limit: query.limit,
        });
        const response = new ApiResponse_1.ApiResponse(200, result, 'Messages retrieved');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getConversationMessages = getConversationMessages;
const sendMessage = async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        const body = req.body;
        const payload = body.type === 'image' && body.imageUrl
            ? { type: 'image', imageUrl: body.imageUrl, caption: body.caption }
            : { type: 'text', text: body.text || '' };
        const message = await whatsappChatService.sendMessage(conversationId, payload);
        const response = new ApiResponse_1.ApiResponse(201, message, 'Message sent');
        res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.sendMessage = sendMessage;
const markConversationRead = async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        await whatsappChatService.markConversationRead(conversationId);
        const response = new ApiResponse_1.ApiResponse(200, { success: true }, 'Marked as read');
        res.json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.markConversationRead = markConversationRead;
//# sourceMappingURL=whatsappChat.controller.js.map