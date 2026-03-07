import { z } from 'zod';
export declare const listConversationsSchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodOptional<z.ZodNumber>>>;
        limit: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodOptional<z.ZodNumber>>>;
        search: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const getConversationMessagesSchema: z.ZodObject<{
    params: z.ZodObject<{
        conversationId: z.ZodString;
    }, z.core.$strip>;
    query: z.ZodObject<{
        page: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodOptional<z.ZodNumber>>>;
        limit: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodOptional<z.ZodNumber>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const sendMessageSchema: z.ZodObject<{
    params: z.ZodObject<{
        conversationId: z.ZodString;
    }, z.core.$strip>;
    body: z.ZodObject<{
        text: z.ZodOptional<z.ZodString>;
        type: z.ZodOptional<z.ZodEnum<{
            text: "text";
            image: "image";
        }>>;
        imageUrl: z.ZodOptional<z.ZodString>;
        caption: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const markReadSchema: z.ZodObject<{
    params: z.ZodObject<{
        conversationId: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=whatsappChat.validation.d.ts.map