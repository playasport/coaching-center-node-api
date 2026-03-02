import { HydratedDocument } from 'mongoose';
export interface ContactAddress {
    office?: string | null;
    registered?: string | null;
}
export interface ContactInfo {
    number?: string[] | null;
    email?: string | null;
    address?: ContactAddress | null;
    whatsapp?: string | null;
    instagram?: string | null;
    facebook?: string | null;
    youtube?: string | null;
}
export interface FeeConfig {
    platform_fee?: number | null;
    gst_percentage?: number | null;
    gst_enabled?: boolean | null;
    currency?: string | null;
    commission_rate?: number | null;
}
export interface SmsConfig {
    enabled?: boolean | null;
    provider?: string | null;
    api_key?: string | null;
    api_secret?: string | null;
    from_number?: string | null;
    sender_id?: string | null;
}
export interface EmailConfig {
    enabled?: boolean | null;
    host?: string | null;
    port?: number | null;
    username?: string | null;
    password?: string | null;
    from?: string | null;
    from_name?: string | null;
    secure?: boolean | null;
}
export interface WhatsAppConfig {
    enabled?: boolean | null;
    provider?: string | null;
    api_key?: string | null;
    api_secret?: string | null;
    from_number?: string | null;
    account_sid?: string | null;
    auth_token?: string | null;
}
export interface NotificationConfig {
    enabled?: boolean | null;
    sms?: SmsConfig | null;
    email?: EmailConfig | null;
    whatsapp?: WhatsAppConfig | null;
    push?: {
        enabled?: boolean | null;
    } | null;
}
export interface PaymentConfig {
    enabled?: boolean | null;
    gateway?: string | null;
    razorpay?: {
        key_id?: string | null;
        key_secret?: string | null;
        enabled?: boolean | null;
    } | null;
    stripe?: {
        api_key?: string | null;
        secret_key?: string | null;
        enabled?: boolean | null;
    } | null;
}
export interface GeneralSettings {
    /** When false, coaching center ratings are disabled (submit/view). Default true. */
    ratings_enabled?: boolean | null;
}
export interface BasicInfo {
    app_name?: string | null;
    app_logo?: string | null;
    about_us?: string | null;
    support_email?: string | null;
    support_phone?: string | null;
    meta_description?: string | null;
    meta_keywords?: string | null;
}
export interface Settings {
    app_name?: string | null;
    app_logo?: string | null;
    contact?: ContactInfo | null;
    basic_info?: BasicInfo | null;
    general?: GeneralSettings | null;
    fees?: FeeConfig | null;
    notifications?: NotificationConfig | null;
    payment?: PaymentConfig | null;
    [key: string]: any;
}
export type SettingsDocument = HydratedDocument<Settings>;
export declare const SettingsModel: import("mongoose").Model<Settings, {}, {}, {}, import("mongoose").Document<unknown, {}, Settings, {}, {}> & Settings & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>;
//# sourceMappingURL=settings.model.d.ts.map