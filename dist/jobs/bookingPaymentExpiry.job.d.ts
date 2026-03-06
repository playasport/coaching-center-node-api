/**
 * 1) Auto-cancel approved bookings where payment link has expired and payment not done.
 * 2) Send payment reminders at configured hours-before-expiry (e.g. 12h, 6h, 2h).
 */
export declare const executeBookingPaymentExpiryJob: () => Promise<void>;
/**
 * Schedule: run every 15 minutes so we catch expiry and reminder windows.
 */
export declare const startBookingPaymentExpiryJob: () => void;
//# sourceMappingURL=bookingPaymentExpiry.job.d.ts.map