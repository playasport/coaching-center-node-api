import { Messaging } from 'firebase-admin/messaging';
export declare const getFCMClient: () => Messaging | null;
export interface SendPushNotificationOptions {
    token: string;
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
}
export declare const sendPushNotification: (options: SendPushNotificationOptions) => Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    retryable?: boolean;
}>;
export interface MulticastPushResult {
    successCount: number;
    failureCount: number;
    responses: Array<{
        token: string;
        success: boolean;
        messageId?: string;
        error?: string;
    }>;
}
export declare const sendMulticastPushNotification: (tokens: string[], title: string, body: string, data?: Record<string, string>, imageUrl?: string) => Promise<MulticastPushResult>;
//# sourceMappingURL=fcm.d.ts.map