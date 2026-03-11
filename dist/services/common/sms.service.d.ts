export type SmsPriority = 'high' | 'medium' | 'low';
export declare const queueSms: (to: string, body: string, priority?: SmsPriority, metadata?: Record<string, unknown>) => void;
export declare const sendSms: (to: string, body: string, priority?: SmsPriority, metadata?: Record<string, unknown>) => Promise<void>;
export declare const sendOtpSms: (mobile: string, otp: string) => Promise<string>;
interface BookingConfirmationSmsData {
    bookingId: string;
    batchName: string;
    sportName: string;
    centerName: string;
    userName?: string;
    participants: string;
    startDate: string;
    startTime: string;
    endTime: string;
    amount: number;
    currency: string;
}
export declare const sendBookingConfirmationUserSms: (mobile: string, data: BookingConfirmationSmsData) => Promise<void>;
export declare const sendBookingConfirmationCenterSms: (mobile: string, data: BookingConfirmationSmsData) => Promise<void>;
export {};
//# sourceMappingURL=sms.service.d.ts.map