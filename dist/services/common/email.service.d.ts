/**
 * Reset email transporter (useful when credentials are updated)
 */
export declare const resetEmailTransporter: () => void;
export declare const loadTemplate: (templateName: string) => Promise<string>;
export declare const renderTemplate: (template: string, variables: Record<string, unknown>) => Promise<string>;
interface EmailAttachment {
    filename: string;
    content: Buffer;
    contentType?: string;
}
interface SendEmailOptions {
    to: string;
    subject: string;
    html?: string;
    text?: string;
    template?: string;
    variables?: Record<string, unknown>;
    attachments?: EmailAttachment[];
}
export declare const sendTemplatedEmail: ({ to, subject, html, text, template, variables, attachments, }: SendEmailOptions) => Promise<string>;
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
/**
 * Send account credentials email to newly created users
 */
export declare const sendAccountCredentialsEmail: (email: string, password: string, name: string) => Promise<string>;
export {};
//# sourceMappingURL=email.service.d.ts.map