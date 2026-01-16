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
  const template = `Great news! Your booking request for "{{batchName}}" at "{{centerName}}" has been approved. Please proceed with payment. Booking ID: {{bookingId}}. - Play A Sport`;
  return replaceVariables(template, variables);
};

/**
 * Booking Approved - User (WhatsApp)
 */
export const getBookingApprovedUserWhatsApp = (variables: NotificationMessageVariables): string => {
  const template = `*Booking Approved*\n\nGreat news! Your booking request for *"{{batchName}}"* at *"{{centerName}}"* has been approved.\n\n*Booking ID:* {{bookingId}}\n\nPlease proceed with payment to confirm your booking.\n\n- Play A Sport`;
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
