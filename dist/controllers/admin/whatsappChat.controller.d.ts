import { Request, Response, NextFunction } from 'express';
export declare const listConversations: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getConversationMessages: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const sendMessage: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const markConversationRead: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const listTemplateMessages: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=whatsappChat.controller.d.ts.map