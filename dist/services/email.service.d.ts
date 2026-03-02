interface SendEmailOptions {
    to: string;
    subject: string;
    html?: string;
    text?: string;
    template?: string;
    variables?: Record<string, unknown>;
}
export declare const sendTemplatedEmail: ({ to, subject, html, text, template, variables, }: SendEmailOptions) => Promise<string>;
interface CommonVariableOptions {
    name?: string;
    expiryMinutes?: number;
    extras?: Record<string, unknown>;
}
export declare const sendOtpEmail: (email: string, otp: string, options?: Omit<CommonVariableOptions, "extras">) => Promise<string>;
export declare const sendPasswordResetEmail: (email: string, otp: string, options?: Omit<CommonVariableOptions, "extras">) => Promise<string>;
interface BookingConfirmationEmailData {
    bookingId: string;
    batchName: string;
    sportName: string;
    centerName: string;
    userName: string;
    userEmail?: string;
    participants: string;
    startDate: string;
    startTime: string;
    endTime: string;
    trainingDays: string;
    amount: number;
    currency: string;
    paymentId: string;
}
export declare const sendBookingConfirmationUserEmail: (email: string, data: BookingConfirmationEmailData) => Promise<string>;
export declare const sendBookingConfirmationCenterEmail: (email: string, data: BookingConfirmationEmailData) => Promise<string>;
export declare const sendBookingConfirmationAdminEmail: (email: string, data: BookingConfirmationEmailData) => Promise<string>;
export {};
//# sourceMappingURL=email.service.d.ts.map