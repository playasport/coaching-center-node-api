import { z } from 'zod';
export declare const sendNotificationSchema: z.ZodObject<{
    body: z.ZodObject<{
        recipientType: z.ZodEnum<{
            user: "user";
            academy: "academy";
        }>;
        recipientId: z.ZodString;
        title: z.ZodString;
        body: z.ZodString;
        channels: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodEnum<{
            push: "push";
            email: "email";
            sms: "sms";
            whatsapp: "whatsapp";
        }>>>>;
        priority: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            high: "high";
            medium: "medium";
            low: "low";
        }>>>;
        data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        imageUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type SendNotificationInput = z.infer<typeof sendNotificationSchema>['body'];
export declare const testNotificationSchema: z.ZodObject<{
    body: z.ZodObject<{
        recipientType: z.ZodEnum<{
            user: "user";
            academy: "academy";
        }>;
        recipientId: z.ZodString;
        channels: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodEnum<{
            push: "push";
            email: "email";
            sms: "sms";
            whatsapp: "whatsapp";
        }>>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type TestNotificationInput = z.infer<typeof testNotificationSchema>['body'];
export declare const listNotificationsSchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodOptional<z.ZodNumber>>>;
        limit: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodOptional<z.ZodNumber>>>;
        isRead: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodOptional<z.ZodBoolean>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type ListNotificationsInput = z.infer<typeof listNotificationsSchema>['query'];
export declare const markAsReadSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const markAsUnreadSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const deleteNotificationSchema: z.ZodObject<{
    params: z.ZodObject<{
        id: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=notification.validation.d.ts.map