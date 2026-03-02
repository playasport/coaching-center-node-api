/**
 * Notification Messages
 * Centralized message templates for SMS, WhatsApp, and Push notifications
 * All messages use template variables that will be replaced at runtime
 */
export interface NotificationMessageVariables {
    userName?: string;
    userEmail?: string;
    batchName?: string;
    centerName?: string;
    sportName?: string;
    participants?: string;
    bookingId?: string;
    batchId?: string;
    centerId?: string;
    reason?: string | null;
    amount?: string;
    currency?: string;
    startDate?: string;
    startTime?: string;
    endTime?: string;
    trainingDays?: string;
    paymentId?: string;
    [key: string]: string | null | undefined;
}
/**
 * Booking Request - Academy Owner (SMS)
 */
export declare const getBookingRequestAcademySms: (variables: NotificationMessageVariables) => string;
/**
 * Booking Request - Academy Owner (WhatsApp)
 */
export declare const getBookingRequestAcademyWhatsApp: (variables: NotificationMessageVariables) => string;
/**
 * Booking Request Sent - User (SMS)
 */
export declare const getBookingRequestSentUserSms: (variables: NotificationMessageVariables) => string;
/**
 * Booking Request Sent - User (WhatsApp)
 */
export declare const getBookingRequestSentUserWhatsApp: (variables: NotificationMessageVariables) => string;
/**
 * Booking Approved - User (SMS)
 */
export declare const getBookingApprovedUserSms: (variables: NotificationMessageVariables) => string;
/**
 * Booking Approved - User (WhatsApp)
 */
export declare const getBookingApprovedUserWhatsApp: (variables: NotificationMessageVariables) => string;
/**
 * Booking Rejected - User (SMS)
 */
export declare const getBookingRejectedUserSms: (variables: NotificationMessageVariables) => string;
/**
 * Booking Rejected - User (WhatsApp)
 */
export declare const getBookingRejectedUserWhatsApp: (variables: NotificationMessageVariables) => string;
/**
 * Booking Cancelled - User (SMS)
 */
export declare const getBookingCancelledUserSms: (variables: NotificationMessageVariables) => string;
/**
 * Booking Cancelled - User (WhatsApp)
 */
export declare const getBookingCancelledUserWhatsApp: (variables: NotificationMessageVariables) => string;
/**
 * Booking Cancelled - Academy (SMS)
 */
export declare const getBookingCancelledAcademySms: (variables: NotificationMessageVariables) => string;
/**
 * Booking Cancelled - Academy (WhatsApp)
 */
export declare const getBookingCancelledAcademyWhatsApp: (variables: NotificationMessageVariables) => string;
/**
 * Payment Verified - User (SMS)
 */
export declare const getPaymentVerifiedUserSms: (variables: NotificationMessageVariables) => string;
/**
 * Payment Verified - Academy (SMS)
 */
export declare const getPaymentVerifiedAcademySms: (variables: NotificationMessageVariables) => string;
/**
 * Payment Verified - User (WhatsApp)
 */
export declare const getPaymentVerifiedUserWhatsApp: (variables: NotificationMessageVariables) => string;
/**
 * Payment Verified - Academy (WhatsApp)
 */
export declare const getPaymentVerifiedAcademyWhatsApp: (variables: NotificationMessageVariables) => string;
/**
 * OTP - SMS (Generic - used for login, registration, password reset, profile update)
 * Uses same expiry as email OTP (config.otp.expiryMinutes).
 */
export declare const getOtpSms: (variables: {
    otp: string;
}) => string;
/**
 * Payout Account Created - Academy (SMS)
 */
export declare const getPayoutAccountCreatedAcademySms: (variables: NotificationMessageVariables) => string;
/**
 * Payout Account Created - Academy (WhatsApp)
 */
export declare const getPayoutAccountCreatedAcademyWhatsApp: (variables: NotificationMessageVariables) => string;
/**
 * Payout Account Activated - Academy (SMS)
 */
export declare const getPayoutAccountActivatedAcademySms: (variables: NotificationMessageVariables) => string;
/**
 * Payout Account Activated - Academy (WhatsApp)
 */
export declare const getPayoutAccountActivatedAcademyWhatsApp: (variables: NotificationMessageVariables) => string;
/**
 * Payout Account Needs Clarification - Academy (SMS)
 */
export declare const getPayoutAccountNeedsClarificationAcademySms: (variables: NotificationMessageVariables) => string;
/**
 * Payout Account Needs Clarification - Academy (WhatsApp)
 */
export declare const getPayoutAccountNeedsClarificationAcademyWhatsApp: (variables: NotificationMessageVariables) => string;
/**
 * Payout Account Rejected - Academy (SMS)
 */
export declare const getPayoutAccountRejectedAcademySms: (variables: NotificationMessageVariables) => string;
/**
 * Payout Account Rejected - Academy (WhatsApp)
 */
export declare const getPayoutAccountRejectedAcademyWhatsApp: (variables: NotificationMessageVariables) => string;
/**
 * Bank Details Updated - Academy (SMS)
 */
export declare const getBankDetailsUpdatedAcademySms: (variables: NotificationMessageVariables) => string;
/**
 * Bank Details Updated - Academy (WhatsApp)
 */
export declare const getBankDetailsUpdatedAcademyWhatsApp: (variables: NotificationMessageVariables) => string;
/**
 * Payout Transfer Initiated - Academy (SMS)
 */
export declare const getPayoutTransferInitiatedAcademySms: (variables: NotificationMessageVariables) => string;
/**
 * Payout Transfer Initiated - Academy (WhatsApp)
 */
export declare const getPayoutTransferInitiatedAcademyWhatsApp: (variables: NotificationMessageVariables) => string;
/**
 * Payout Transfer Completed - Academy (SMS)
 */
export declare const getPayoutTransferCompletedAcademySms: (variables: NotificationMessageVariables) => string;
/**
 * Payout Transfer Completed - Academy (WhatsApp)
 */
export declare const getPayoutTransferCompletedAcademyWhatsApp: (variables: NotificationMessageVariables) => string;
/**
 * Payout Transfer Failed - Academy (SMS)
 */
export declare const getPayoutTransferFailedAcademySms: (variables: NotificationMessageVariables) => string;
/**
 * Payout Transfer Failed - Academy (WhatsApp)
 */
export declare const getPayoutTransferFailedAcademyWhatsApp: (variables: NotificationMessageVariables) => string;
/**
 * Email Template Names
 */
export declare const EmailTemplates: {
    readonly BOOKING_REQUEST_ACADEMY: "booking-request-academy.html";
    readonly BOOKING_REQUEST_SENT_USER: "booking-request-sent-user.html";
    readonly BOOKING_APPROVED_USER: "booking-approved-user.html";
    readonly BOOKING_REJECTED_USER: "booking-rejected-user.html";
    readonly BOOKING_CONFIRMATION_USER: "booking-confirmation-user.html";
    readonly BOOKING_CONFIRMATION_CENTER: "booking-confirmation-center.html";
    readonly BOOKING_CONFIRMATION_ADMIN: "booking-confirmation-admin.html";
    readonly BOOKING_CANCELLED_USER: "booking-cancelled-user.html";
    readonly BOOKING_CANCELLED_ACADEMY: "booking-cancelled-academy.html";
    readonly BOOKING_CANCELLED_ADMIN: "booking-cancelled-admin.html";
    readonly PAYOUT_ACCOUNT_CREATED: "payout-account-created.html";
    readonly PAYOUT_ACCOUNT_ACTIVATED: "payout-account-activated.html";
};
/**
 * Email Subject Lines
 */
export declare const EmailSubjects: {
    readonly BOOKING_REQUEST_ACADEMY: "New Booking Request - Play A Sport";
    readonly BOOKING_REQUEST_SENT_USER: "Booking Request Sent - Play A Sport";
    readonly BOOKING_APPROVED_USER: "Booking Approved - Play A Sport";
    readonly BOOKING_REJECTED_USER: "Booking Request Rejected - Play A Sport";
    readonly BOOKING_CONFIRMATION_USER: "Booking Confirmed - Play A Sport";
    readonly BOOKING_CONFIRMATION_CENTER: "New Booking Received - Play A Sport";
    readonly BOOKING_CONFIRMATION_ADMIN: "New Booking Notification - Play A Sport";
    readonly BOOKING_CANCELLED_USER: "Booking Cancelled - Play A Sport";
    readonly BOOKING_CANCELLED_ACADEMY: "Booking Cancelled - Play A Sport";
    readonly BOOKING_CANCELLED_ADMIN: "Booking Cancelled - Play A Sport";
    readonly BOOKING_REFUNDED_USER: "Booking Refunded - Play A Sport";
    readonly PAYOUT_ACCOUNT_CREATED: "Payout Account Created - Play A Sport";
    readonly PAYOUT_ACCOUNT_ACTIVATED: "Payout Account Activated - Play A Sport";
    readonly PAYOUT_ACCOUNT_ACTION_REQUIRED: "Payout Account - Action Required - Play A Sport";
    readonly PAYOUT_ACCOUNT_REJECTED: "Payout Account Rejected - Play A Sport";
    readonly BANK_DETAILS_UPDATED: "Bank Details Updated - Play A Sport";
};
/**
 * Booking Request - Academy Owner (Email Text)
 */
export declare const getBookingRequestAcademyEmailText: (variables: NotificationMessageVariables) => string;
/**
 * Booking Request Sent - User (Email Text)
 */
export declare const getBookingRequestSentUserEmailText: (variables: NotificationMessageVariables) => string;
/**
 * Booking Confirmation - User (Email Text)
 */
export declare const getBookingConfirmationUserEmailText: (variables: NotificationMessageVariables) => string;
/**
 * Booking Confirmation - Center (Email Text)
 */
export declare const getBookingConfirmationCenterEmailText: (variables: NotificationMessageVariables) => string;
/**
 * Booking Confirmation - Admin (Email Text)
 */
export declare const getBookingConfirmationAdminEmailText: (variables: NotificationMessageVariables) => string;
/**
 * Booking Cancelled - User (Email Text)
 */
export declare const getBookingCancelledUserEmailText: (variables: NotificationMessageVariables) => string;
/**
 * Booking Cancelled - Academy (Email Text)
 */
export declare const getBookingCancelledAcademyEmailText: (variables: NotificationMessageVariables) => string;
/**
 * Booking Cancelled - Admin (Email Text)
 */
export declare const getBookingCancelledAdminEmailText: (variables: NotificationMessageVariables) => string;
/**
 * Booking Approved - User (Email Text)
 */
export declare const getBookingApprovedUserEmailText: (variables: NotificationMessageVariables) => string;
/**
 * Booking Rejected - User (Email Text)
 */
export declare const getBookingRejectedUserEmailText: (variables: NotificationMessageVariables) => string;
/**
 * Booking Refunded - User (Email Text)
 */
export declare const getBookingRefundedUserEmailText: (variables: NotificationMessageVariables) => string;
/**
 * Payout Account Created - Academy (Email Text)
 */
export declare const getPayoutAccountCreatedAcademyEmailText: (variables: NotificationMessageVariables) => string;
/**
 * Bank Details Updated - Academy (Email Text)
 */
export declare const getBankDetailsUpdatedAcademyEmailText: (variables: NotificationMessageVariables) => string;
/**
 * Payout Account Activated - Academy (Email Text)
 */
export declare const getPayoutAccountActivatedAcademyEmailText: (variables: NotificationMessageVariables) => string;
/**
 * Payout Account - Action Required - Academy (Email Text)
 */
export declare const getPayoutAccountActionRequiredAcademyEmailText: (variables: NotificationMessageVariables) => string;
/**
 * Payout Account Rejected - Academy (Email Text)
 */
export declare const getPayoutAccountRejectedAcademyEmailText: (variables: NotificationMessageVariables) => string;
/**
 * Push Notification Templates
 */
export interface PushNotificationTemplate {
    title: string;
    body: string;
}
/**
 * Booking Request - Academy Owner (Push Notification)
 */
export declare const getBookingRequestAcademyPush: (variables: NotificationMessageVariables) => PushNotificationTemplate;
/**
 * Booking Request Sent - User (Push Notification)
 */
export declare const getBookingRequestSentUserPush: (variables: NotificationMessageVariables) => PushNotificationTemplate;
/**
 * Booking Request - Admin (Push Notification)
 */
export declare const getBookingRequestAdminPush: (variables: NotificationMessageVariables) => PushNotificationTemplate;
/**
 * Booking Confirmation - User (Push Notification)
 */
export declare const getBookingConfirmationUserPush: (variables: NotificationMessageVariables) => PushNotificationTemplate;
/**
 * Booking Confirmation - Academy (Push Notification)
 */
export declare const getBookingConfirmationAcademyPush: (variables: NotificationMessageVariables) => PushNotificationTemplate;
/**
 * Booking Confirmation - Admin (Push Notification)
 */
export declare const getBookingConfirmationAdminPush: (variables: NotificationMessageVariables) => PushNotificationTemplate;
/**
 * Booking Cancelled - User (Push Notification)
 */
export declare const getBookingCancelledUserPush: (variables: NotificationMessageVariables) => PushNotificationTemplate;
/**
 * Booking Cancelled - Academy (Push Notification)
 */
export declare const getBookingCancelledAcademyPush: (variables: NotificationMessageVariables) => PushNotificationTemplate;
/**
 * Booking Approved - User (Push Notification)
 */
export declare const getBookingApprovedUserPush: (variables: NotificationMessageVariables) => PushNotificationTemplate;
/**
 * Booking Rejected - User (Push Notification)
 */
export declare const getBookingRejectedUserPush: (variables: NotificationMessageVariables) => PushNotificationTemplate;
/**
 * Booking Refunded - User (Push Notification)
 */
export declare const getBookingRefundedUserPush: (variables: NotificationMessageVariables) => PushNotificationTemplate;
/**
 * Booking Refunded - Academy (Push Notification)
 */
export declare const getBookingRefundedAcademyPush: (variables: NotificationMessageVariables) => PushNotificationTemplate;
/**
 * Payout Account Created - Academy (Push Notification)
 */
export declare const getPayoutAccountCreatedAcademyPush: (variables: NotificationMessageVariables) => PushNotificationTemplate;
/**
 * Bank Details Updated - Academy (Push Notification)
 */
export declare const getBankDetailsUpdatedAcademyPush: (variables: NotificationMessageVariables) => PushNotificationTemplate;
/**
 * Payout Account Activated - Academy (Push Notification)
 */
export declare const getPayoutAccountActivatedAcademyPush: (variables: NotificationMessageVariables) => PushNotificationTemplate;
/**
 * Payout Account - Action Required - Academy (Push Notification)
 */
export declare const getPayoutAccountActionRequiredAcademyPush: (variables: NotificationMessageVariables) => PushNotificationTemplate;
/**
 * Payout Account Rejected - Academy (Push Notification)
 */
export declare const getPayoutAccountRejectedAcademyPush: (variables: NotificationMessageVariables) => PushNotificationTemplate;
/**
 * Payout Transfer Initiated - Academy (Push Notification)
 */
export declare const getPayoutTransferInitiatedAcademyPush: (variables: NotificationMessageVariables) => PushNotificationTemplate;
/**
 * Payout Completed - Academy (Push Notification)
 */
export declare const getPayoutTransferCompletedAcademyPush: (variables: NotificationMessageVariables) => PushNotificationTemplate;
/**
 * New Academy Registration - Admin (Push Notification)
 */
export declare const getNewAcademyRegistrationAdminPush: (variables: NotificationMessageVariables) => PushNotificationTemplate;
/**
 * New User Registration - Admin (Push Notification)
 */
export declare const getNewUserRegistrationAdminPush: (variables: NotificationMessageVariables) => PushNotificationTemplate;
//# sourceMappingURL=notificationMessages.d.ts.map