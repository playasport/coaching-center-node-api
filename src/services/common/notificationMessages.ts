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
 * Replace template variables in a message
 */
const replaceVariables = (template: string, variables: NotificationMessageVariables): string => {
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
export const getBookingRequestAcademySms = (variables: NotificationMessageVariables): string => {
  const template = `New booking request for batch "{{batchName}}" from {{userName}}. Participants: {{participants}}. Booking ID: {{bookingId}}. - Play A Sport`;
  return replaceVariables(template, variables);
};

/**
 * Booking Request - Academy Owner (WhatsApp)
 */
export const getBookingRequestAcademyWhatsApp = (variables: NotificationMessageVariables): string => {
  const template = `*New Booking Request*\n\nYou have a new booking request for batch *"{{batchName}}"* from {{userName}}.\n\n*Participants:* {{participants}}\n*Booking ID:* {{bookingId}}\n\nPlease review and respond.\n\n- Play A Sport`;
  return replaceVariables(template, variables);
};

/**
 * Booking Request Sent - User (SMS)
 */
export const getBookingRequestSentUserSms = (variables: NotificationMessageVariables): string => {
  const template = `Your booking request for "{{batchName}}" at "{{centerName}}" has been sent. You will be notified once the academy responds. Booking ID: {{bookingId}}. - Play A Sport`;
  return replaceVariables(template, variables);
};

/**
 * Booking Request Sent - User (WhatsApp)
 */
export const getBookingRequestSentUserWhatsApp = (variables: NotificationMessageVariables): string => {
  const template = `*Booking Request Sent*\n\nYour booking request for *"{{batchName}}"* at *"{{centerName}}"* has been sent to the academy.\n\n*Participants:* {{participants}}\n*Booking ID:* {{bookingId}}\n\nYou will be notified once the academy responds.\n\n- Play A Sport`;
  return replaceVariables(template, variables);
};

/**
 * Booking Approved - User (SMS)
 */
export const getBookingApprovedUserSms = (variables: NotificationMessageVariables): string => {
  const template = `Great news! Your booking request for "{{batchName}}" at "{{centerName}}" has been approved. Please proceed with payment. Booking ID: {{bookingId}}. View bookings: https://www.playasport.in/bookings - Play A Sport`;
  return replaceVariables(template, variables);
};

/**
 * Booking Approved - User (WhatsApp)
 */
export const getBookingApprovedUserWhatsApp = (variables: NotificationMessageVariables): string => {
  const template = `*Booking Approved*\n\nGreat news! Your booking request for *"{{batchName}}"* at *"{{centerName}}"* has been approved.\n\n*Booking ID:* {{bookingId}}\n\nPlease proceed with payment to confirm your booking.\n\nView your bookings: https://www.playasport.in/bookings\n\n- Play A Sport`;
  return replaceVariables(template, variables);
};

/**
 * Booking Rejected - User (SMS)
 */
export const getBookingRejectedUserSms = (variables: NotificationMessageVariables): string => {
  const reasonText = variables.reason ? ` Reason: ${variables.reason}` : '';
  const template = `Your booking request for "{{batchName}}" at "{{centerName}}" has been rejected.${reasonText} Booking ID: {{bookingId}}. - Play A Sport`;
  return replaceVariables(template, variables);
};

/**
 * Booking Rejected - User (WhatsApp)
 */
export const getBookingRejectedUserWhatsApp = (variables: NotificationMessageVariables): string => {
  const reasonText = variables.reason ? `\n\n*Reason:* ${variables.reason}` : '';
  const template = `*Booking Request Rejected*\n\nYour booking request for *"{{batchName}}"* at *"{{centerName}}"* has been rejected.${reasonText}\n\n*Booking ID:* {{bookingId}}\n\nWe're sorry for any inconvenience. Please feel free to book another slot.\n\n- Play A Sport`;
  return replaceVariables(template, variables);
};

/**
 * Booking Cancelled - User (SMS)
 */
export const getBookingCancelledUserSms = (variables: NotificationMessageVariables): string => {
  const reasonText = variables.reason ? ` Reason: ${variables.reason}` : '';
  const template = `Your booking for "{{batchName}}" at "{{centerName}}" has been cancelled.${reasonText} Booking ID: {{bookingId}}. - Play A Sport`;
  return replaceVariables(template, variables);
};

/**
 * Booking Cancelled - User (WhatsApp)
 */
export const getBookingCancelledUserWhatsApp = (variables: NotificationMessageVariables): string => {
  const reasonText = variables.reason ? `\n\n*Reason:* ${variables.reason}` : '';
  const template = `*Booking Cancelled*\n\nYour booking for *"{{batchName}}"* at *"{{centerName}}"* has been cancelled.${reasonText}\n\n*Booking ID:* {{bookingId}}\n\n- Play A Sport`;
  return replaceVariables(template, variables);
};

/**
 * Booking Cancelled - Academy (SMS)
 */
export const getBookingCancelledAcademySms = (variables: NotificationMessageVariables): string => {
  const reasonText = variables.reason ? ` Reason: ${variables.reason}` : '';
  const template = `Booking {{bookingId}} for batch "{{batchName}}" has been cancelled by {{userName}}.${reasonText} - Play A Sport`;
  return replaceVariables(template, variables);
};

/**
 * Booking Cancelled - Academy (WhatsApp)
 */
export const getBookingCancelledAcademyWhatsApp = (variables: NotificationMessageVariables): string => {
  const reasonText = variables.reason ? `\n\n*Reason:* ${variables.reason}` : '';
  const template = `*Booking Cancelled*\n\nBooking *{{bookingId}}* for batch *"{{batchName}}"* has been cancelled by {{userName}}.${reasonText}\n\n- Play A Sport`;
  return replaceVariables(template, variables);
};

/**
 * Payment Verified - User (SMS)
 */
export const getPaymentVerifiedUserSms = (variables: NotificationMessageVariables): string => {
  const template = `Dear {{userName}}, your booking {{bookingId}} for {{batchName}} ({{sportName}}) at {{centerName}} has been confirmed. Participants: {{participants}}. Start Date: {{startDate}}, Time: {{startTime}}-{{endTime}}. Amount Paid: {{currency}} {{amount}}. Thank you for choosing Play A Sport!`;
  return replaceVariables(template, variables);
};

/**
 * Payment Verified - Academy (SMS)
 */
export const getPaymentVerifiedAcademySms = (variables: NotificationMessageVariables): string => {
  const template = `New booking {{bookingId}} received for {{batchName}} ({{sportName}}). Customer: {{userName}}. Participants: {{participants}}. Start Date: {{startDate}}, Time: {{startTime}}-{{endTime}}. Amount: {{currency}} {{amount}}. - Play A Sport`;
  return replaceVariables(template, variables);
};

/**
 * Payment Verified - User (WhatsApp)
 */
export const getPaymentVerifiedUserWhatsApp = (variables: NotificationMessageVariables): string => {
  const template = `*Booking Confirmed! 🎉*\n\nDear {{userName}}, your booking has been confirmed!\n\n*Booking ID:* {{bookingId}}\n*Batch:* {{batchName}} ({{sportName}})\n*Center:* {{centerName}}\n*Participants:* {{participants}}\n*Start Date:* {{startDate}}\n*Time:* {{startTime}} - {{endTime}}\n*Amount Paid:* {{currency}} {{amount}}\n\nThank you for choosing Play A Sport!\n\n- Play A Sport Team`;
  return replaceVariables(template, variables);
};

/**
 * Payment Verified - Academy (WhatsApp)
 */
export const getPaymentVerifiedAcademyWhatsApp = (variables: NotificationMessageVariables): string => {
  const template = `*New Booking Received! 💰*\n\nYou have received a new booking!\n\n*Booking ID:* {{bookingId}}\n*Batch:* {{batchName}} ({{sportName}})\n*Customer:* {{userName}}\n*Participants:* {{participants}}\n*Start Date:* {{startDate}}\n*Time:* {{startTime}} - {{endTime}}\n*Amount:* {{currency}} {{amount}}\n\n- Play A Sport`;
  return replaceVariables(template, variables);
};

/**
 * OTP - SMS (Generic - used for login, registration, password reset, profile update)
 */
export const getOtpSms = (variables: { otp: string }): string => {
  return `Your Play A Sport OTP is ${variables.otp}. This OTP will expire in 5 minutes. Do not share this OTP with anyone. Play A Sport Team Thank You.`;
};

/**
 * Payout Account Created - Academy (SMS)
 */
export const getPayoutAccountCreatedAcademySms = (variables: NotificationMessageVariables): string => {
  const template = `Your payout account has been created successfully. Account ID: {{accountId}}. Status: {{status}}. You will be notified once your account is activated. - Play A Sport`;
  return replaceVariables(template, variables);
};

/**
 * Payout Account Created - Academy (WhatsApp)
 */
export const getPayoutAccountCreatedAcademyWhatsApp = (variables: NotificationMessageVariables): string => {
  const template = `*Payout Account Created*\n\nYour payout account has been created successfully!\n\n*Account ID:* {{accountId}}\n*Status:* {{status}}\n\nYou will be notified once your account is activated by our team.\n\n- Play A Sport`;
  return replaceVariables(template, variables);
};

/**
 * Payout Account Activated - Academy (SMS)
 */
export const getPayoutAccountActivatedAcademySms = (variables: NotificationMessageVariables): string => {
  const template = `Great news! Your payout account has been activated. Account ID: {{accountId}}. You can now receive payouts. - Play A Sport`;
  return replaceVariables(template, variables);
};

/**
 * Payout Account Activated - Academy (WhatsApp)
 */
export const getPayoutAccountActivatedAcademyWhatsApp = (variables: NotificationMessageVariables): string => {
  const template = `*Payout Account Activated! 🎉*\n\nGreat news! Your payout account has been activated.\n\n*Account ID:* {{accountId}}\n\nYou can now receive payouts from bookings.\n\n- Play A Sport`;
  return replaceVariables(template, variables);
};

/**
 * Payout Account Needs Clarification - Academy (SMS)
 */
export const getPayoutAccountNeedsClarificationAcademySms = (variables: NotificationMessageVariables): string => {
  const template = `Your payout account requires additional information. Account ID: {{accountId}}. Please check your account and provide the required details. - Play A Sport`;
  return replaceVariables(template, variables);
};

/**
 * Payout Account Needs Clarification - Academy (WhatsApp)
 */
export const getPayoutAccountNeedsClarificationAcademyWhatsApp = (variables: NotificationMessageVariables): string => {
  const template = `*Payout Account - Action Required*\n\nYour payout account requires additional information.\n\n*Account ID:* {{accountId}}\n*Requirements:* {{requirements}}\n\nPlease check your account and provide the required details to complete activation.\n\n- Play A Sport`;
  return replaceVariables(template, variables);
};

/**
 * Payout Account Rejected - Academy (SMS)
 */
export const getPayoutAccountRejectedAcademySms = (variables: NotificationMessageVariables): string => {
  const reasonText = variables.reason ? ` Reason: ${variables.reason}` : '';
  const template = `Your payout account has been rejected. Account ID: {{accountId}}.${reasonText} Please contact support for assistance. - Play A Sport`;
  return replaceVariables(template, variables);
};

/**
 * Payout Account Rejected - Academy (WhatsApp)
 */
export const getPayoutAccountRejectedAcademyWhatsApp = (variables: NotificationMessageVariables): string => {
  const reasonText = variables.reason ? `\n\n*Reason:* ${variables.reason}` : '';
  const template = `*Payout Account Rejected*\n\nYour payout account has been rejected.${reasonText}\n\n*Account ID:* {{accountId}}\n\nPlease contact support for assistance.\n\n- Play A Sport`;
  return replaceVariables(template, variables);
};

/**
 * Bank Details Updated - Academy (SMS)
 */
export const getBankDetailsUpdatedAcademySms = (variables: NotificationMessageVariables): string => {
  const template = `Your bank account details have been updated successfully. Account ID: {{accountId}}. The details are under verification. - Play A Sport`;
  return replaceVariables(template, variables);
};

/**
 * Bank Details Updated - Academy (WhatsApp)
 */
export const getBankDetailsUpdatedAcademyWhatsApp = (variables: NotificationMessageVariables): string => {
  const template = `*Bank Details Updated*\n\nYour bank account details have been updated successfully.\n\n*Account ID:* {{accountId}}\n\nYour bank details are under verification. You will be notified once verified.\n\n- Play A Sport`;
  return replaceVariables(template, variables);
};

/**
 * Payout Transfer Initiated - Academy (SMS)
 */
export const getPayoutTransferInitiatedAcademySms = (variables: NotificationMessageVariables): string => {
  const template = `Your payout of ₹{{amount}} has been initiated. Transfer ID: {{transferId}}. You will be notified once the transfer is completed. - Play A Sport`;
  return replaceVariables(template, variables);
};

/**
 * Payout Transfer Initiated - Academy (WhatsApp)
 */
export const getPayoutTransferInitiatedAcademyWhatsApp = (variables: NotificationMessageVariables): string => {
  const template = `*Payout Transfer Initiated*\n\nYour payout of ₹{{amount}} has been initiated.\n\n*Transfer ID:* {{transferId}}\n\nYou will be notified once the transfer is completed.\n\n- Play A Sport`;
  return replaceVariables(template, variables);
};

/**
 * Payout Transfer Completed - Academy (SMS)
 */
export const getPayoutTransferCompletedAcademySms = (variables: NotificationMessageVariables): string => {
  const template = `Great news! Your payout of ₹{{amount}} has been successfully transferred to your account. Transfer ID: {{transferId}}. - Play A Sport`;
  return replaceVariables(template, variables);
};

/**
 * Payout Transfer Completed - Academy (WhatsApp)
 */
export const getPayoutTransferCompletedAcademyWhatsApp = (variables: NotificationMessageVariables): string => {
  const template = `*Payout Transfer Completed! 🎉*\n\nGreat news! Your payout of ₹{{amount}} has been successfully transferred to your account.\n\n*Transfer ID:* {{transferId}}\n\nThank you for using Play A Sport!\n\n- Play A Sport`;
  return replaceVariables(template, variables);
};

/**
 * Payout Transfer Failed - Academy (SMS)
 */
export const getPayoutTransferFailedAcademySms = (variables: NotificationMessageVariables): string => {
  const reasonText = variables.reason ? ` Reason: ${variables.reason}` : '';
  const template = `Your payout transfer of ₹{{amount}} has failed.${reasonText} Please contact support for assistance. - Play A Sport`;
  return replaceVariables(template, variables);
};

/**
 * Payout Transfer Failed - Academy (WhatsApp)
 */
export const getPayoutTransferFailedAcademyWhatsApp = (variables: NotificationMessageVariables): string => {
  const reasonText = variables.reason ? `\n\n*Reason:* ${variables.reason}` : '';
  const template = `*Payout Transfer Failed*\n\nYour payout transfer of ₹{{amount}} has failed.${reasonText}\n\nPlease contact support for assistance.\n\n- Play A Sport`;
  return replaceVariables(template, variables);
};

/**
 * Email Template Names
 */
export const EmailTemplates = {
  BOOKING_REQUEST_ACADEMY: 'booking-request-academy.html',
  BOOKING_REQUEST_SENT_USER: 'booking-request-sent-user.html',
  BOOKING_CONFIRMATION_USER: 'booking-confirmation-user.html',
  BOOKING_CONFIRMATION_CENTER: 'booking-confirmation-center.html',
  BOOKING_CONFIRMATION_ADMIN: 'booking-confirmation-admin.html',
  BOOKING_CANCELLED_USER: 'booking-cancelled-user.html',
  BOOKING_CANCELLED_ACADEMY: 'booking-cancelled-academy.html',
  BOOKING_CANCELLED_ADMIN: 'booking-cancelled-admin.html',
} as const;

/**
 * Email Subject Lines
 */
export const EmailSubjects = {
  BOOKING_REQUEST_ACADEMY: 'New Booking Request - PlayAsport',
  BOOKING_REQUEST_SENT_USER: 'Booking Request Sent - PlayAsport',
  BOOKING_CONFIRMATION_USER: 'Booking Confirmed - Play A Sport',
  BOOKING_CONFIRMATION_CENTER: 'New Booking Received - Play A Sport',
  BOOKING_CONFIRMATION_ADMIN: 'New Booking Notification - Play A Sport',
  BOOKING_CANCELLED_USER: 'Booking Cancelled - PlayAsport',
  BOOKING_CANCELLED_ACADEMY: 'Booking Cancelled - PlayAsport',
  BOOKING_CANCELLED_ADMIN: 'Booking Cancelled - PlayAsport',
} as const;

/**
 * Booking Request - Academy Owner (Email Text)
 */
export const getBookingRequestAcademyEmailText = (variables: NotificationMessageVariables): string => {
  const template = `You have a new booking request for batch "{{batchName}}" from {{userName}}. Participants: {{participants}}.`;
  return replaceVariables(template, variables);
};

/**
 * Booking Request Sent - User (Email Text)
 */
export const getBookingRequestSentUserEmailText = (variables: NotificationMessageVariables): string => {
  const template = `Your booking request for "{{batchName}}" at "{{centerName}}" has been sent to the academy. You will be notified once the academy responds.`;
  return replaceVariables(template, variables);
};

/**
 * Booking Confirmation - User (Email Text)
 */
export const getBookingConfirmationUserEmailText = (variables: NotificationMessageVariables): string => {
  const template = `Your booking {{bookingId}} has been confirmed for {{batchName}} at {{centerName}}.`;
  return replaceVariables(template, variables);
};

/**
 * Booking Confirmation - Center (Email Text)
 */
export const getBookingConfirmationCenterEmailText = (variables: NotificationMessageVariables): string => {
  const template = `You have received a new booking {{bookingId}} for {{batchName}} from {{userName}}.`;
  return replaceVariables(template, variables);
};

/**
 * Booking Confirmation - Admin (Email Text)
 */
export const getBookingConfirmationAdminEmailText = (variables: NotificationMessageVariables): string => {
  const template = `A new booking {{bookingId}} has been confirmed for {{batchName}} at {{centerName}}.`;
  return replaceVariables(template, variables);
};

/**
 * Booking Cancelled - User (Email Text)
 */
export const getBookingCancelledUserEmailText = (variables: NotificationMessageVariables): string => {
  const reasonText = variables.reason ? ` Reason: ${variables.reason}` : '';
  const template = `Your booking for "{{batchName}}" at "{{centerName}}" has been cancelled.${reasonText}`;
  return replaceVariables(template, variables);
};

/**
 * Booking Cancelled - Academy (Email Text)
 */
export const getBookingCancelledAcademyEmailText = (variables: NotificationMessageVariables): string => {
  const reasonText = variables.reason ? ` Reason: ${variables.reason}` : '';
  const template = `Booking {{bookingId}} for batch "{{batchName}}" has been cancelled by {{userName}}.${reasonText}`;
  return replaceVariables(template, variables);
};

/**
 * Booking Cancelled - Admin (Email Text)
 */
export const getBookingCancelledAdminEmailText = (variables: NotificationMessageVariables): string => {
  const reasonText = variables.reason ? ` Reason: ${variables.reason}` : '';
  const template = `Booking {{bookingId}} for batch "{{batchName}}" at "{{centerName}}" has been cancelled by {{userName}}.${reasonText}`;
  return replaceVariables(template, variables);
};
