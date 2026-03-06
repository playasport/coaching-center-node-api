"use strict";
/**
 * Notification Messages
 * Centralized message templates for SMS, WhatsApp, and Push notifications
 * All messages use template variables that will be replaced at runtime
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPayoutAccountActionRequiredAcademyEmailText = exports.getPayoutAccountActivatedAcademyEmailText = exports.getBankDetailsUpdatedAcademyEmailText = exports.getPayoutAccountCreatedAcademyEmailText = exports.getBookingRefundedUserEmailText = exports.getBookingRejectedUserEmailText = exports.getBookingApprovedUserEmailText = exports.getBookingCancelledAdminEmailText = exports.getBookingCancelledAcademyEmailText = exports.getBookingCancelledUserEmailText = exports.getBookingConfirmationAdminEmailText = exports.getBookingConfirmationCenterEmailText = exports.getBookingConfirmationUserEmailText = exports.getBookingRequestSentUserEmailText = exports.getBookingRequestAcademyEmailText = exports.EmailSubjects = exports.EmailTemplates = exports.getPayoutTransferFailedAcademyWhatsApp = exports.getPayoutTransferFailedAcademySms = exports.getPayoutTransferCompletedAcademyWhatsApp = exports.getPayoutTransferCompletedAcademySms = exports.getPayoutTransferInitiatedAcademyWhatsApp = exports.getPayoutTransferInitiatedAcademySms = exports.getBankDetailsUpdatedAcademyWhatsApp = exports.getBankDetailsUpdatedAcademySms = exports.getPayoutAccountRejectedAcademyWhatsApp = exports.getPayoutAccountRejectedAcademySms = exports.getPayoutAccountNeedsClarificationAcademyWhatsApp = exports.getPayoutAccountNeedsClarificationAcademySms = exports.getPayoutAccountActivatedAcademyWhatsApp = exports.getPayoutAccountActivatedAcademySms = exports.getPayoutAccountCreatedAcademyWhatsApp = exports.getPayoutAccountCreatedAcademySms = exports.getOtpSms = exports.getPaymentVerifiedAcademyWhatsApp = exports.getPaymentVerifiedUserWhatsApp = exports.getPaymentVerifiedAcademySms = exports.getPaymentVerifiedUserSms = exports.getBookingCancelledAcademyWhatsApp = exports.getBookingCancelledAcademySms = exports.getBookingCancelledUserWhatsApp = exports.getBookingCancelledUserSms = exports.getBookingRejectedUserWhatsApp = exports.getBookingRejectedUserSms = exports.getBookingApprovedUserWhatsApp = exports.getBookingApprovedUserSms = exports.getBookingRequestSentUserWhatsApp = exports.getBookingRequestSentUserSms = exports.getBookingRequestAcademyWhatsApp = exports.getBookingRequestAcademySms = void 0;
exports.getNewUserRegistrationAdminPush = exports.getNewAcademyRegistrationAdminPush = exports.getPayoutTransferCompletedAcademyPush = exports.getPayoutTransferInitiatedAcademyPush = exports.getPayoutAccountRejectedAcademyPush = exports.getPayoutAccountActionRequiredAcademyPush = exports.getPayoutAccountActivatedAcademyPush = exports.getBankDetailsUpdatedAcademyPush = exports.getPayoutAccountCreatedAcademyPush = exports.getBookingRefundedAcademyPush = exports.getBookingRefundedUserPush = exports.getBookingRejectedUserPush = exports.getPaymentReminderUserPush = exports.getPaymentReminderUserEmailText = exports.getPaymentReminderUserWhatsApp = exports.getPaymentReminderUserSms = exports.getBookingApprovedUserPush = exports.getBookingCancelledAcademyPush = exports.getBookingCancelledUserPush = exports.getBookingConfirmationAdminPush = exports.getBookingConfirmationAcademyPush = exports.getBookingConfirmationUserPush = exports.getBookingRequestAdminPush = exports.getBookingRequestSentUserPush = exports.getBookingRequestAcademyPush = exports.getPayoutAccountRejectedAcademyEmailText = void 0;
const env_1 = require("../../config/env");
/**
 * Replace template variables in a message
 */
const replaceVariables = (template, variables) => {
    let message = template;
    Object.keys(variables).forEach((key) => {
        const value = variables[key];
        if (value !== null && value !== undefined) {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            message = message.replace(regex, String(value));
        }
    });
    return message;
};
/**
 * Booking Request - Academy Owner (SMS)
 */
const getBookingRequestAcademySms = (variables) => {
    const template = `You have received a new booking request for batch "{{batchName}}" from {{userName}}. Participants: {{participants}}. Booking ID: {{bookingId}}. - Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getBookingRequestAcademySms = getBookingRequestAcademySms;
/**
 * Booking Request - Academy Owner (WhatsApp)
 */
const getBookingRequestAcademyWhatsApp = (variables) => {
    const template = `*Booking Request Received*\n\nA new booking request has been submitted for batch *"{{batchName}}"* from {{userName}}.\n\n*Participants:* {{participants}}\n*Booking ID:* {{bookingId}}\n\nPlease review and respond.\n\n- Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getBookingRequestAcademyWhatsApp = getBookingRequestAcademyWhatsApp;
/**
 * Booking Request Sent - User (SMS)
 */
const getBookingRequestSentUserSms = (variables) => {
    const template = `Your booking request for "{{batchName}}" at "{{centerName}}" has been sent. You will be notified once the academy responds. Booking ID: {{bookingId}}. - Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getBookingRequestSentUserSms = getBookingRequestSentUserSms;
/**
 * Booking Request Sent - User (WhatsApp)
 */
const getBookingRequestSentUserWhatsApp = (variables) => {
    const template = `*Booking Request Sent*\n\nWe’ve sent your booking request for *"{{batchName}}"* at *"{{centerName}}"*.\n\n*Participants:* {{participants}}\n*Booking ID:* {{bookingId}}\n\nYou will receive an update once the academy responds.\n\n- Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getBookingRequestSentUserWhatsApp = getBookingRequestSentUserWhatsApp;
/**
 * Booking Approved - User (SMS)
 */
const getBookingApprovedUserSms = (variables) => {
    const template = `Great news! Your booking request for "{{batchName}}" at "{{centerName}}" has been approved. Please complete payment to confirm. Booking ID: {{bookingId}}. View bookings: https://www.playasport.in/bookings - Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getBookingApprovedUserSms = getBookingApprovedUserSms;
/**
 * Booking Approved - User (WhatsApp)
 */
const getBookingApprovedUserWhatsApp = (variables) => {
    const template = `*Booking Approved!*\n\nGreat news! Your booking request for *"{{batchName}}"* at *"{{centerName}}"* has been approved.\n\n*Booking ID:* {{bookingId}}\n\nComplete the payment now to confirm your booking.\n\nView your bookings: https://www.playasport.in/bookings\n\n- Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getBookingApprovedUserWhatsApp = getBookingApprovedUserWhatsApp;
/**
 * Booking Rejected - User (SMS)
 */
const getBookingRejectedUserSms = (variables) => {
    const reasonText = variables.reason ? ` Reason: ${variables.reason}` : '';
    const template = `Your booking request for "{{batchName}}" at "{{centerName}}" has been rejected.${reasonText} Booking ID: {{bookingId}}. - Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getBookingRejectedUserSms = getBookingRejectedUserSms;
/**
 * Booking Rejected - User (WhatsApp)
 */
const getBookingRejectedUserWhatsApp = (variables) => {
    const reasonText = variables.reason ? `\n\n*Reason:* ${variables.reason}` : '';
    const template = `*Booking Not Approved*\n\nThis center couldn’t accept your booking at the moment for *"{{batchName}}"* at *"{{centerName}}"*.${reasonText}\n\n*Booking ID:* {{bookingId}}\n\nYou can try booking with another center that suits you.\n\n- Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getBookingRejectedUserWhatsApp = getBookingRejectedUserWhatsApp;
/**
 * Booking Cancelled - User (SMS)
 */
const getBookingCancelledUserSms = (variables) => {
    const reasonText = variables.reason ? ` Reason: ${variables.reason}` : '';
    const template = `Your booking for "{{batchName}}" at "{{centerName}}" has been cancelled successfully.${reasonText} Booking ID: {{bookingId}}. - Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getBookingCancelledUserSms = getBookingCancelledUserSms;
/**
 * Booking Cancelled - User (WhatsApp)
 */
const getBookingCancelledUserWhatsApp = (variables) => {
    const reasonText = variables.reason ? `\n\n*Reason:* ${variables.reason}` : '';
    const template = `*Booking Cancelled*\n\nYour booking for *"{{batchName}}"* at *"{{centerName}}"* has been cancelled.${reasonText}\n\n*Booking ID:* {{bookingId}}\n\n- Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getBookingCancelledUserWhatsApp = getBookingCancelledUserWhatsApp;
/**
 * Booking Cancelled - Academy (SMS)
 */
const getBookingCancelledAcademySms = (variables) => {
    const reasonText = variables.reason ? ` Reason: ${variables.reason}` : '';
    const template = `The Booking {{bookingId}} for batch "{{batchName}}" has been cancelled by {{userName}}.${reasonText} - Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getBookingCancelledAcademySms = getBookingCancelledAcademySms;
/**
 * Booking Cancelled - Academy (WhatsApp)
 */
const getBookingCancelledAcademyWhatsApp = (variables) => {
    const reasonText = variables.reason ? `\n\n*Reason:* ${variables.reason}` : '';
    const template = `*Booking Cancelled by {{userName}}*\n\n{{userName}} has cancelled their booking *{{bookingId}}* for batch *"{{batchName}}"*.\n\nThe slot is now available for other bookings.${reasonText}\n\n- Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getBookingCancelledAcademyWhatsApp = getBookingCancelledAcademyWhatsApp;
/**
 * Payment Verified - User (SMS)
 */
const getPaymentVerifiedUserSms = (variables) => {
    const template = `Dear {{userName}}, Your payment is successful and your booking {{bookingId}} for {{batchName}} ({{sportName}}) at {{centerName}} has been confirmed. Participants: {{participants}}. Start Date: {{startDate}}, Time: {{startTime}}-{{endTime}}. Amount Paid: {{currency}} {{amount}}. Thank you for choosing Play A Sport!`;
    return replaceVariables(template, variables);
};
exports.getPaymentVerifiedUserSms = getPaymentVerifiedUserSms;
/**
 * Payment Verified - Academy (SMS)
 */
const getPaymentVerifiedAcademySms = (variables) => {
    const template = `Payment successfully received. Booking {{bookingId}} for {{batchName}} ({{sportName}}). Customer: {{userName}}. Participants: {{participants}}. Start Date: {{startDate}}, Time: {{startTime}}-{{endTime}}. Amount: {{currency}} {{amount}}. - Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getPaymentVerifiedAcademySms = getPaymentVerifiedAcademySms;
/**
 * Payment Verified - User (WhatsApp)
 */
const getPaymentVerifiedUserWhatsApp = (variables) => {
    const template = `*Payment Successful & Verified!*\n\nDear {{userName}}, Your payment is successful and your booking is confirmed.\n\n*Booking ID:* {{bookingId}}\n*Batch:* {{batchName}} ({{sportName}})\n*Center:* {{centerName}}\n*Participants:* {{participants}}\n*Start Date:* {{startDate}}\n*Time:* {{startTime}} - {{endTime}}\n*Amount Paid:* {{currency}} {{amount}}\n\nThank you for choosing Play A Sport!\n\n- Play A Sport Team`;
    return replaceVariables(template, variables);
};
exports.getPaymentVerifiedUserWhatsApp = getPaymentVerifiedUserWhatsApp;
/**
 * Payment Verified - Academy (WhatsApp)
 */
const getPaymentVerifiedAcademyWhatsApp = (variables) => {
    const template = `*Payment Confirmation – Booking!*\n\nA booking payment has been successfully completed and verified.\n\n*Booking ID:* {{bookingId}}\n*Batch:* {{batchName}} ({{sportName}})\n*Customer:* {{userName}}\n*Participants:* {{participants}}\n*Start Date:* {{startDate}}\n*Time:* {{startTime}} - {{endTime}}\n*Amount:* {{currency}} {{amount}}\n\n- Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getPaymentVerifiedAcademyWhatsApp = getPaymentVerifiedAcademyWhatsApp;
/**
 * OTP - SMS (Generic - used for login, registration, password reset, profile update)
 * Uses same expiry as email OTP (config.otp.expiryMinutes).
 */
const getOtpSms = (variables) => {
    const minutes = env_1.config.otp.expiryMinutes;
    return `Your Play A Sport OTP is ${variables.otp}. This OTP will expire in ${minutes} minutes. Do not share this OTP with anyone. Thank You.`;
};
exports.getOtpSms = getOtpSms;
/**
 * Payout Account Created - Academy (SMS)
 */
const getPayoutAccountCreatedAcademySms = (variables) => {
    const template = `Your payout account has been created successfully. Account ID: {{accountId}}. Status: {{status}}. You will be notified once your account is activated. - Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getPayoutAccountCreatedAcademySms = getPayoutAccountCreatedAcademySms;
/**
 * Payout Account Created - Academy (WhatsApp)
 */
const getPayoutAccountCreatedAcademyWhatsApp = (variables) => {
    const template = `*Payout Account Created*\n\nYour payout account has been created successfully!\n\n*Account ID:* {{accountId}}\n*Status:* {{status}}\n\nYou will be notified once your account is activated by our team.\n\n- Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getPayoutAccountCreatedAcademyWhatsApp = getPayoutAccountCreatedAcademyWhatsApp;
/**
 * Payout Account Activated - Academy (SMS)
 */
const getPayoutAccountActivatedAcademySms = (variables) => {
    const template = `Great news! Your payout account has been successfully activated. Account ID: {{accountId}}. You can now start receiving payouts. - Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getPayoutAccountActivatedAcademySms = getPayoutAccountActivatedAcademySms;
/**
 * Payout Account Activated - Academy (WhatsApp)
 */
const getPayoutAccountActivatedAcademyWhatsApp = (variables) => {
    const template = `*Payout account activated.*\n\nGreat news! Your payout account has been activated.\n\n*Account ID:* {{accountId}}\n\nYou can now receive payouts from bookings.\n\n- Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getPayoutAccountActivatedAcademyWhatsApp = getPayoutAccountActivatedAcademyWhatsApp;
/**
 * Payout Account Needs Clarification - Academy (SMS)
 */
const getPayoutAccountNeedsClarificationAcademySms = (variables) => {
    const template = `Your payout account requires additional information. Account ID: {{accountId}}. Please update the required details to enable payouts. - Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getPayoutAccountNeedsClarificationAcademySms = getPayoutAccountNeedsClarificationAcademySms;
/**
 * Payout Account Needs Clarification - Academy (WhatsApp)
 */
const getPayoutAccountNeedsClarificationAcademyWhatsApp = (variables) => {
    const template = `*Payout Account - Action Required*\n\nYour payout account requires additional information.\n\n*Account ID:* {{accountId}}\n*Requirements:* {{requirements}}\n\nPlease check your account and provide the required details to complete activation.\n\n- Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getPayoutAccountNeedsClarificationAcademyWhatsApp = getPayoutAccountNeedsClarificationAcademyWhatsApp;
/**
 * Payout Account Rejected - Academy (SMS)
 */
const getPayoutAccountRejectedAcademySms = (variables) => {
    const reasonText = variables.reason ? ` Reason: ${variables.reason}` : '';
    const template = `Your payout account has been rejected. Account ID: {{accountId}}.${reasonText} Please contact support for assistance. - Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getPayoutAccountRejectedAcademySms = getPayoutAccountRejectedAcademySms;
/**
 * Payout Account Rejected - Academy (WhatsApp)
 */
const getPayoutAccountRejectedAcademyWhatsApp = (variables) => {
    const reasonText = variables.reason ? `\n\n*Reason:* ${variables.reason}` : '';
    const template = `*Payout Account Rejected!*\n\nYour payout account could not be approved.${reasonText}\n\n*Account ID:* {{accountId}}\n\nPlease contact support for assistance.\n\n- Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getPayoutAccountRejectedAcademyWhatsApp = getPayoutAccountRejectedAcademyWhatsApp;
/**
 * Bank Details Updated - Academy (SMS)
 */
const getBankDetailsUpdatedAcademySms = (variables) => {
    const template = `Your bank account details have been updated successfully. Account ID: {{accountId}}. The details are under verification. - Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getBankDetailsUpdatedAcademySms = getBankDetailsUpdatedAcademySms;
/**
 * Bank Details Updated - Academy (WhatsApp)
 */
const getBankDetailsUpdatedAcademyWhatsApp = (variables) => {
    const template = `*Bank Details Updated*\n\nYour bank account details have been updated successfully.\n\n*Account ID:* {{accountId}}\n\nYour bank details are under verification. You will be notified once verified.\n\n- Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getBankDetailsUpdatedAcademyWhatsApp = getBankDetailsUpdatedAcademyWhatsApp;
/**
 * Payout Transfer Initiated - Academy (SMS)
 */
const getPayoutTransferInitiatedAcademySms = (variables) => {
    const template = `Your payout of ₹{{amount}} has been initiated. Transfer ID: {{transferId}}. You will be notified once the transfer is completed. - Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getPayoutTransferInitiatedAcademySms = getPayoutTransferInitiatedAcademySms;
/**
 * Payout Transfer Initiated - Academy (WhatsApp)
 */
const getPayoutTransferInitiatedAcademyWhatsApp = (variables) => {
    const template = `*Payout Transfer Initiated*\n\nYour payout of ₹{{amount}} has been initiated.\n\n*Transfer ID:* {{transferId}}\n\nYou will be notified once the transfer is completed.\n\n- Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getPayoutTransferInitiatedAcademyWhatsApp = getPayoutTransferInitiatedAcademyWhatsApp;
/**
 * Payout Transfer Completed - Academy (SMS)
 */
const getPayoutTransferCompletedAcademySms = (variables) => {
    const template = `Great news! Your payout of ₹{{amount}} has been successfully transferred to your account. Transfer ID: {{transferId}}. - Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getPayoutTransferCompletedAcademySms = getPayoutTransferCompletedAcademySms;
/**
 * Payout Transfer Completed - Academy (WhatsApp)
 */
const getPayoutTransferCompletedAcademyWhatsApp = (variables) => {
    const template = `*Payout Transfer Completed!*\n\nGreat news! Your payout of ₹{{amount}} has been successfully transferred to your account.\n\n*Transfer ID:* {{transferId}}\n\nThank you for using Play A Sport!\n\n- Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getPayoutTransferCompletedAcademyWhatsApp = getPayoutTransferCompletedAcademyWhatsApp;
/**
 * Payout Transfer Failed - Academy (SMS)
 */
const getPayoutTransferFailedAcademySms = (variables) => {
    const reasonText = variables.reason ? ` Reason: ${variables.reason}` : '';
    const template = `Your payout transfer of ₹{{amount}} has failed.${reasonText} Please contact support for assistance. - Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getPayoutTransferFailedAcademySms = getPayoutTransferFailedAcademySms;
/**
 * Payout Transfer Failed - Academy (WhatsApp)
 */
const getPayoutTransferFailedAcademyWhatsApp = (variables) => {
    const reasonText = variables.reason ? `\n\n*Reason:* ${variables.reason}` : '';
    const template = `*Payout Transfer Failed*\n\nYour payout transfer of ₹{{amount}} has failed.${reasonText}\n\nPlease contact support for assistance.\n\n- Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getPayoutTransferFailedAcademyWhatsApp = getPayoutTransferFailedAcademyWhatsApp;
/**
 * Email Template Names
 */
exports.EmailTemplates = {
    BOOKING_REQUEST_ACADEMY: 'booking-request-academy.html',
    BOOKING_REQUEST_SENT_USER: 'booking-request-sent-user.html',
    BOOKING_APPROVED_USER: 'booking-approved-user.html',
    BOOKING_REJECTED_USER: 'booking-rejected-user.html',
    BOOKING_CONFIRMATION_USER: 'booking-confirmation-user.html',
    BOOKING_CONFIRMATION_CENTER: 'booking-confirmation-center.html',
    BOOKING_CONFIRMATION_ADMIN: 'booking-confirmation-admin.html',
    BOOKING_CANCELLED_USER: 'booking-cancelled-user.html',
    BOOKING_CANCELLED_ACADEMY: 'booking-cancelled-academy.html',
    BOOKING_CANCELLED_ADMIN: 'booking-cancelled-admin.html',
    BOOKING_PAYMENT_REMINDER_USER: 'booking-payment-reminder-user.html',
    PAYOUT_ACCOUNT_CREATED: 'payout-account-created.html',
    PAYOUT_ACCOUNT_ACTIVATED: 'payout-account-activated.html',
};
/**
 * Email Subject Lines
 */
exports.EmailSubjects = {
    BOOKING_REQUEST_ACADEMY: 'New Booking Request - Play A Sport',
    BOOKING_REQUEST_SENT_USER: 'Booking Request Sent - Play A Sport',
    BOOKING_APPROVED_USER: 'Booking Approved - Play A Sport',
    BOOKING_REJECTED_USER: 'Booking Request Rejected - Play A Sport',
    BOOKING_CONFIRMATION_USER: 'Booking Confirmed - Play A Sport',
    BOOKING_CONFIRMATION_CENTER: 'New Booking Received - Play A Sport',
    BOOKING_CONFIRMATION_ADMIN: 'New Booking Notification - Play A Sport',
    BOOKING_CANCELLED_USER: 'Booking Cancelled - Play A Sport',
    BOOKING_CANCELLED_ACADEMY: 'Booking Cancelled - Play A Sport',
    BOOKING_CANCELLED_ADMIN: 'Booking Cancelled - Play A Sport',
    BOOKING_PAYMENT_REMINDER_USER: 'Complete your payment - Play A Sport',
    BOOKING_REFUNDED_USER: 'Booking Refunded - Play A Sport',
    PAYOUT_ACCOUNT_CREATED: 'Payout Account Created - Play A Sport',
    PAYOUT_ACCOUNT_ACTIVATED: 'Payout Account Activated - Play A Sport',
    PAYOUT_ACCOUNT_ACTION_REQUIRED: 'Payout Account - Action Required - Play A Sport',
    PAYOUT_ACCOUNT_REJECTED: 'Payout Account Rejected - Play A Sport',
    BANK_DETAILS_UPDATED: 'Bank Details Updated - Play A Sport',
};
/**
 * Booking Request - Academy Owner (Email Text)
 */
const getBookingRequestAcademyEmailText = (variables) => {
    const template = `You have a new booking request for batch "{{batchName}}" from {{userName}}. Participants: {{participants}}.`;
    return replaceVariables(template, variables);
};
exports.getBookingRequestAcademyEmailText = getBookingRequestAcademyEmailText;
/**
 * Booking Request Sent - User (Email Text)
 */
const getBookingRequestSentUserEmailText = (variables) => {
    const template = `Your booking request for "{{batchName}}" at "{{centerName}}" has been sent to the academy. You will be notified once the academy responds.`;
    return replaceVariables(template, variables);
};
exports.getBookingRequestSentUserEmailText = getBookingRequestSentUserEmailText;
/**
 * Booking Confirmation - User (Email Text)
 */
const getBookingConfirmationUserEmailText = (variables) => {
    const template = `Your booking {{bookingId}} has been confirmed for {{batchName}} at {{centerName}}.`;
    return replaceVariables(template, variables);
};
exports.getBookingConfirmationUserEmailText = getBookingConfirmationUserEmailText;
/**
 * Booking Confirmation - Center (Email Text)
 */
const getBookingConfirmationCenterEmailText = (variables) => {
    const template = `You have received a new booking {{bookingId}} for {{batchName}} from {{userName}}.`;
    return replaceVariables(template, variables);
};
exports.getBookingConfirmationCenterEmailText = getBookingConfirmationCenterEmailText;
/**
 * Booking Confirmation - Admin (Email Text)
 */
const getBookingConfirmationAdminEmailText = (variables) => {
    const template = `A new booking {{bookingId}} has been confirmed for {{batchName}} at {{centerName}}.`;
    return replaceVariables(template, variables);
};
exports.getBookingConfirmationAdminEmailText = getBookingConfirmationAdminEmailText;
/**
 * Booking Cancelled - User (Email Text)
 */
const getBookingCancelledUserEmailText = (variables) => {
    const reasonText = variables.reason ? ` Reason: ${variables.reason}` : '';
    const template = `Your booking for "{{batchName}}" at "{{centerName}}" has been cancelled.${reasonText}`;
    return replaceVariables(template, variables);
};
exports.getBookingCancelledUserEmailText = getBookingCancelledUserEmailText;
/**
 * Booking Cancelled - Academy (Email Text)
 */
const getBookingCancelledAcademyEmailText = (variables) => {
    const reasonText = variables.reason ? ` Reason: ${variables.reason}` : '';
    const template = `Booking {{bookingId}} for batch "{{batchName}}" has been cancelled by {{userName}}.${reasonText}`;
    return replaceVariables(template, variables);
};
exports.getBookingCancelledAcademyEmailText = getBookingCancelledAcademyEmailText;
/**
 * Booking Cancelled - Admin (Email Text)
 */
const getBookingCancelledAdminEmailText = (variables) => {
    const reasonText = variables.reason ? ` Reason: ${variables.reason}` : '';
    const template = `Booking {{bookingId}} for batch "{{batchName}}" at "{{centerName}}" has been cancelled by {{userName}}.${reasonText}`;
    return replaceVariables(template, variables);
};
exports.getBookingCancelledAdminEmailText = getBookingCancelledAdminEmailText;
/**
 * Booking Approved - User (Email Text)
 */
const getBookingApprovedUserEmailText = (variables) => {
    const template = `Your booking request for "{{batchName}}" at "{{centerName}}" has been approved. Please proceed with payment.`;
    return replaceVariables(template, variables);
};
exports.getBookingApprovedUserEmailText = getBookingApprovedUserEmailText;
/**
 * Booking Rejected - User (Email Text)
 */
const getBookingRejectedUserEmailText = (variables) => {
    const reasonText = variables.reason ? ` Reason: ${variables.reason}` : '';
    const template = `Your booking request for "{{batchName}}" at "{{centerName}}" has been rejected.${reasonText}`;
    return replaceVariables(template, variables);
};
exports.getBookingRejectedUserEmailText = getBookingRejectedUserEmailText;
/**
 * Booking Refunded - User (Email Text)
 */
const getBookingRefundedUserEmailText = (variables) => {
    const template = `Dear {{userName}},\n\nYour booking {{bookingId}} has been refunded.\n\nRefund Amount: ₹{{amount}}\nReason: {{reason}}\n\nRefund ID: {{refundId}}\n\nThe refund will be processed to your original payment method within 5-7 business days.\n\nIf you have any questions, please contact support.\n\nBest regards,\nPlay A Sport Team`;
    return replaceVariables(template, variables);
};
exports.getBookingRefundedUserEmailText = getBookingRefundedUserEmailText;
/**
 * Payout Account Created - Academy (Email Text)
 */
const getPayoutAccountCreatedAcademyEmailText = (variables) => {
    const template = `Dear {{userName}},\n\nYour payout account has been created successfully.\n\nAccount ID: {{accountId}}\nStatus: {{status}}\n\nYou will be notified once your account is activated.\n\nBest regards,\nPlay A Sport Team`;
    return replaceVariables(template, variables);
};
exports.getPayoutAccountCreatedAcademyEmailText = getPayoutAccountCreatedAcademyEmailText;
/**
 * Bank Details Updated - Academy (Email Text)
 */
const getBankDetailsUpdatedAcademyEmailText = (variables) => {
    const template = `Dear {{userName}},\n\nYour bank account details have been updated successfully.\n\nAccount ID: {{accountId}}\n\nYour bank details are under verification. You will be notified once verified.\n\nBest regards,\nPlay A Sport Team`;
    return replaceVariables(template, variables);
};
exports.getBankDetailsUpdatedAcademyEmailText = getBankDetailsUpdatedAcademyEmailText;
/**
 * Payout Account Activated - Academy (Email Text)
 */
const getPayoutAccountActivatedAcademyEmailText = (variables) => {
    const template = `Dear {{userName}},\n\nGreat news! Your payout account has been activated.\n\nAccount ID: {{accountId}}\n\nYou can now receive payouts.\n\nBest regards,\nPlay A Sport Team`;
    return replaceVariables(template, variables);
};
exports.getPayoutAccountActivatedAcademyEmailText = getPayoutAccountActivatedAcademyEmailText;
/**
 * Payout Account - Action Required - Academy (Email Text)
 */
const getPayoutAccountActionRequiredAcademyEmailText = (variables) => {
    const template = `Dear {{userName}},\n\nYour payout account requires additional information.\n\nAccount ID: {{accountId}}\nRequirements: {{requirementsText}}\n\nPlease check your account and provide the required details to complete activation.\n\nBest regards,\nPlay A Sport Team`;
    return replaceVariables(template, variables);
};
exports.getPayoutAccountActionRequiredAcademyEmailText = getPayoutAccountActionRequiredAcademyEmailText;
/**
 * Payout Account Rejected - Academy (Email Text)
 */
const getPayoutAccountRejectedAcademyEmailText = (variables) => {
    const template = `Dear {{userName}},\n\nYour payout account has been rejected.\n\nAccount ID: {{accountId}}\nReason: {{reason}}\n\nPlease contact support for assistance.\n\nBest regards,\nPlay A Sport Team`;
    return replaceVariables(template, variables);
};
exports.getPayoutAccountRejectedAcademyEmailText = getPayoutAccountRejectedAcademyEmailText;
/**
 * Booking Request - Academy Owner (Push Notification)
 */
const getBookingRequestAcademyPush = (variables) => {
    return {
        title: 'New Booking Request',
        body: replaceVariables(`You have a new booking request for batch "{{batchName}}" from {{userName}}. Participants: {{participants}}.`, variables),
    };
};
exports.getBookingRequestAcademyPush = getBookingRequestAcademyPush;
/**
 * Booking Request Sent - User (Push Notification)
 */
const getBookingRequestSentUserPush = (variables) => {
    return {
        title: 'Booking Request Sent',
        body: replaceVariables(`Your booking request for "{{batchName}}" has been sent to the academy. You will be notified once the academy responds.`, variables),
    };
};
exports.getBookingRequestSentUserPush = getBookingRequestSentUserPush;
/**
 * Booking Request - Admin (Push Notification)
 */
const getBookingRequestAdminPush = (variables) => {
    return {
        title: 'New Booking Request',
        body: replaceVariables(`New booking request created: {{userName}} requested booking for "{{batchName}}" at "{{centerName}}".`, variables),
    };
};
exports.getBookingRequestAdminPush = getBookingRequestAdminPush;
/**
 * Booking Confirmation - User (Push Notification)
 */
const getBookingConfirmationUserPush = (variables) => {
    return {
        title: 'Booking Confirmed!',
        body: replaceVariables(`Your payment was successful & booking {{bookingId}} for "{{batchName}}" at "{{centerName}}" has been confirmed. Thank you for choosing Play A Sport.`, variables),
    };
};
exports.getBookingConfirmationUserPush = getBookingConfirmationUserPush;
/**
 * Booking Confirmation - Academy (Push Notification)
 */
const getBookingConfirmationAcademyPush = (variables) => {
    return {
        title: 'New Confirmed Booking',
        body: replaceVariables(`Payment has been verified, and the booking {{bookingId}} for "{{batchName}}" by {{userName}} is now confirmed.`, variables),
    };
};
exports.getBookingConfirmationAcademyPush = getBookingConfirmationAcademyPush;
/**
 * Booking Confirmation - Admin (Push Notification)
 */
const getBookingConfirmationAdminPush = (variables) => {
    return {
        title: 'New Booking Confirmed',
        body: replaceVariables(`Payment successful! Booking {{bookingId}} for "{{batchName}}" at "{{centerName}}" has been confirmed.`, variables),
    };
};
exports.getBookingConfirmationAdminPush = getBookingConfirmationAdminPush;
/**
 * Booking Cancelled - User (Push Notification)
 */
const getBookingCancelledUserPush = (variables) => {
    const reasonText = variables.reason ? ` Reason: ${variables.reason}` : '';
    return {
        title: 'Booking Cancelled',
        body: replaceVariables(`Your booking for "{{batchName}}" has been cancelled.${reasonText}`, variables),
    };
};
exports.getBookingCancelledUserPush = getBookingCancelledUserPush;
/**
 * Booking Cancelled - Academy (Push Notification)
 */
const getBookingCancelledAcademyPush = (variables) => {
    const reasonText = variables.reason ? ` Reason: ${variables.reason}` : '';
    return {
        title: 'Booking Cancelled',
        body: replaceVariables(`Booking {{bookingId}} for batch "{{batchName}}" has been cancelled by {{userName}}.${reasonText}`, variables),
    };
};
exports.getBookingCancelledAcademyPush = getBookingCancelledAcademyPush;
/**
 * Booking Approved - User (Push Notification)
 */
const getBookingApprovedUserPush = (variables) => {
    return {
        title: 'Booking Approved!',
        body: replaceVariables(`Your booking request for "{{batchName}}" has been approved. Please proceed with payment.`, variables),
    };
};
exports.getBookingApprovedUserPush = getBookingApprovedUserPush;
/**
 * Payment reminder - User (SMS). Variables: batchName, centerName, bookingId, hoursLeft, paymentUrl
 */
const getPaymentReminderUserSms = (variables) => {
    const template = `Reminder: Complete payment for your booking "{{batchName}}" at "{{centerName}}". {{hoursLeft}} hours left. Booking ID: {{bookingId}}. - Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getPaymentReminderUserSms = getPaymentReminderUserSms;
/**
 * Payment reminder - User (WhatsApp)
 */
const getPaymentReminderUserWhatsApp = (variables) => {
    const template = `*Payment reminder*\n\nComplete payment for your booking *"{{batchName}}"* at *"{{centerName}}"*.\n\n*Time left:* {{hoursLeft}} hours\n*Booking ID:* {{bookingId}}\n\nPay now to confirm your slot.\n\n- Play A Sport`;
    return replaceVariables(template, variables);
};
exports.getPaymentReminderUserWhatsApp = getPaymentReminderUserWhatsApp;
/**
 * Payment reminder - User (Email plain text)
 */
const getPaymentReminderUserEmailText = (variables) => {
    const template = `Reminder: Your booking for "{{batchName}}" at "{{centerName}}" is pending payment. You have {{hoursLeft}} hours left to pay. Booking ID: {{bookingId}}.`;
    return replaceVariables(template, variables);
};
exports.getPaymentReminderUserEmailText = getPaymentReminderUserEmailText;
/**
 * Payment reminder - User (Push)
 */
const getPaymentReminderUserPush = (variables) => {
    return {
        title: 'Complete your payment',
        body: replaceVariables(`Your booking for "{{batchName}}" has {{hoursLeft}} hours left to pay.`, variables),
    };
};
exports.getPaymentReminderUserPush = getPaymentReminderUserPush;
/**
 * Booking Rejected - User (Push Notification)
 */
const getBookingRejectedUserPush = (variables) => {
    const reasonText = variables.reason ? ` Reason: ${variables.reason}` : '';
    return {
        title: 'Booking Request Rejected',
        body: replaceVariables(`Your booking request for "{{batchName}}" has been rejected.${reasonText}`, variables),
    };
};
exports.getBookingRejectedUserPush = getBookingRejectedUserPush;
/**
 * Booking Refunded - User (Push Notification)
 */
const getBookingRefundedUserPush = (variables) => {
    return {
        title: 'Booking Refunded',
        body: replaceVariables(`Your booking {{bookingId}} has been refunded. Amount: ₹{{amount}}`, variables),
    };
};
exports.getBookingRefundedUserPush = getBookingRefundedUserPush;
/**
 * Booking Refunded - Academy (Push Notification)
 */
const getBookingRefundedAcademyPush = (variables) => {
    return {
        title: 'Booking Refunded',
        body: replaceVariables(`Booking {{bookingId}} has been refunded. Amount: ₹{{amount}}`, variables),
    };
};
exports.getBookingRefundedAcademyPush = getBookingRefundedAcademyPush;
/**
 * Payout Account Created - Academy (Push Notification)
 */
const getPayoutAccountCreatedAcademyPush = (variables) => {
    return {
        title: 'Payout Account Created',
        body: replaceVariables(`Your payout account has been created successfully. Status: {{status}}. You will be notified once your account is activated.`, variables),
    };
};
exports.getPayoutAccountCreatedAcademyPush = getPayoutAccountCreatedAcademyPush;
/**
 * Bank Details Updated - Academy (Push Notification)
 */
const getBankDetailsUpdatedAcademyPush = (variables) => {
    return {
        title: 'Bank Details Updated',
        body: replaceVariables(`Your bank account details have been updated successfully. The details are under verification.`, variables),
    };
};
exports.getBankDetailsUpdatedAcademyPush = getBankDetailsUpdatedAcademyPush;
/**
 * Payout Account Activated - Academy (Push Notification)
 */
const getPayoutAccountActivatedAcademyPush = (variables) => {
    return {
        title: 'Payout Account Activated!',
        body: replaceVariables(`Great news! Your payout account has been activated. You can now start receiving payouts.`, variables),
    };
};
exports.getPayoutAccountActivatedAcademyPush = getPayoutAccountActivatedAcademyPush;
/**
 * Payout Account - Action Required - Academy (Push Notification)
 */
const getPayoutAccountActionRequiredAcademyPush = (variables) => {
    return {
        title: 'Payout Account - Action Required',
        body: replaceVariables(`Your payout account requires additional information: {{requirementsText}}. Please check your account.`, variables),
    };
};
exports.getPayoutAccountActionRequiredAcademyPush = getPayoutAccountActionRequiredAcademyPush;
/**
 * Payout Account Rejected - Academy (Push Notification)
 */
const getPayoutAccountRejectedAcademyPush = (variables) => {
    return {
        title: 'Payout Account Rejected',
        body: replaceVariables(`Your payout account has been rejected. Reason: {{reason}}. Please contact support.`, variables),
    };
};
exports.getPayoutAccountRejectedAcademyPush = getPayoutAccountRejectedAcademyPush;
/**
 * Payout Transfer Initiated - Academy (Push Notification)
 */
const getPayoutTransferInitiatedAcademyPush = (variables) => {
    return {
        title: 'Payout Transfer Initiated',
        body: replaceVariables(`Your payout of ₹{{amount}} has been initiated. Transfer ID: {{transferId}}`, variables),
    };
};
exports.getPayoutTransferInitiatedAcademyPush = getPayoutTransferInitiatedAcademyPush;
/**
 * Payout Completed - Academy (Push Notification)
 */
const getPayoutTransferCompletedAcademyPush = (variables) => {
    return {
        title: 'Payout Completed!',
        body: replaceVariables(`Your payout of ₹{{amount}} has been successfully transferred. Transfer ID: {{transferId}}`, variables),
    };
};
exports.getPayoutTransferCompletedAcademyPush = getPayoutTransferCompletedAcademyPush;
/**
 * New Academy Registration - Admin (Push Notification)
 */
const getNewAcademyRegistrationAdminPush = (variables) => {
    return {
        title: 'New Academy Registration',
        body: replaceVariables(`{{userName}} ({{userEmail}}) has registered as an academy.`, variables),
    };
};
exports.getNewAcademyRegistrationAdminPush = getNewAcademyRegistrationAdminPush;
/**
 * New User Registration - Admin (Push Notification)
 */
const getNewUserRegistrationAdminPush = (variables) => {
    return {
        title: 'New User Registration',
        body: replaceVariables(`{{userName}} ({{userEmail}}) has registered as a {{userType}}.`, variables),
    };
};
exports.getNewUserRegistrationAdminPush = getNewUserRegistrationAdminPush;
//# sourceMappingURL=notificationMessages.js.map