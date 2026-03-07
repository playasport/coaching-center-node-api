import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import * as whatsappChatService from '../../services/admin/whatsappChat.service';

export const listConversations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = req.query as any;
    const result = await whatsappChatService.listConversations({
      page: query.page,
      limit: query.limit,
      search: query.search,
    });
    const response = new ApiResponse(200, result, 'Conversations retrieved');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const getConversationMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const query = req.query as any;
    const result = await whatsappChatService.getConversationMessages(conversationId, {
      page: query.page,
      limit: query.limit,
    });
    const response = new ApiResponse(200, result, 'Messages retrieved');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const body = req.body as { text?: string; type?: 'text' | 'image'; imageUrl?: string; caption?: string };
    const payload =
      body.type === 'image' && body.imageUrl
        ? { type: 'image' as const, imageUrl: body.imageUrl, caption: body.caption }
        : { type: 'text' as const, text: body.text || '' };
    const message = await whatsappChatService.sendMessage(conversationId, payload);
    const response = new ApiResponse(201, message, 'Message sent');
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const markConversationRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    await whatsappChatService.markConversationRead(conversationId);
    const response = new ApiResponse(200, { success: true }, 'Marked as read');
    res.json(response);
  } catch (error) {
    next(error);
  }
};
