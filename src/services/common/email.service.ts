import nodemailer, { Transporter } from 'nodemailer';
import { promises as fs } from 'fs';
import path from 'path';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { getEmailConfig } from './settings.service';

let transporter: Transporter | null = null;
let transporterInitializationPromise: Promise<Transporter | null> | null = null;
const templateCache = new Map<string, string>();
let logoBase64Cache: string | null = null;

const TEMPLATE_DIRECTORIES = [
  path.resolve(process.cwd(), 'dist', 'email', 'templates'),
  path.resolve(process.cwd(), 'email', 'templates'),
  path.resolve(process.cwd(), 'src', 'email', 'templates'),
  path.resolve(__dirname, '..', 'email', 'templates'),
];

/**
 * Load logo as base64 for email templates
 */
const loadLogoAsBase64 = async (): Promise<string | null> => {
  if (logoBase64Cache) {
    return logoBase64Cache;
  }

  try {
    const logoPaths = [
      path.resolve(process.cwd(), 'src', 'statics', 'images', 'logo.png'),
      path.resolve(process.cwd(), 'dist', 'statics', 'images', 'logo.png'),
      path.resolve(__dirname, '..', '..', 'statics', 'images', 'logo.png'),
      path.resolve(__dirname, '..', 'statics', 'images', 'logo.png'),
    ];

    for (const logoPath of logoPaths) {
      try {
        await fs.access(logoPath);
        const logoBuffer = await fs.readFile(logoPath);
        const base64Logo = logoBuffer.toString('base64');
        const mimeType = 'image/png';
        logoBase64Cache = `data:${mimeType};base64,${base64Logo}`;
        return logoBase64Cache;
      } catch {
        continue;
      }
    }
    
    logger.warn('Logo file not found for email templates');
    return null;
  } catch (error) {
    logger.error('Error loading logo for email templates:', error);
    return null;
  }
};

const getTransporter = async (): Promise<Transporter | null> => {
  // If transporter already exists, return it
  if (transporter) {
    return transporter;
  }

  // If initialization is in progress, wait for it
  if (transporterInitializationPromise) {
    return transporterInitializationPromise;
  }

  // Initialize transporter with settings priority
  transporterInitializationPromise = (async (): Promise<Transporter | null> => {
    try {
      const emailConfig = await getEmailConfig();

      if (!emailConfig.enabled) {
        return null;
      }

      if (!emailConfig.host || !emailConfig.username || !emailConfig.password) {
        return null;
      }

      transporter = nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        auth: {
          user: emailConfig.username,
          pass: emailConfig.password,
        },
      });

      return transporter;
    } catch (error) {
      logger.error('Failed to initialize email transporter with settings, using env fallback', error);
      
      // Fallback to env
      if (!config.email.enabled) {
        return null;
      }

      if (!config.email.host || !config.email.username || !config.email.password) {
        return null;
      }

      transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        auth: {
          user: config.email.username,
          pass: config.email.password,
        },
      });

      return transporter;
    } finally {
      transporterInitializationPromise = null;
    }
  })();

  return transporterInitializationPromise;
};

/**
 * Reset email transporter (useful when credentials are updated)
 */
export const resetEmailTransporter = (): void => {
  transporter = null;
  transporterInitializationPromise = null;
};

const resolveTemplatePath = async (templateName: string): Promise<string | null> => {
  for (const dir of TEMPLATE_DIRECTORIES) {
    const filePath = path.join(dir, templateName);
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      // Continue searching other directories
    }
  }
  return null;
};

export const loadTemplate = async (templateName: string): Promise<string> => {
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName) as string;
  }

  const templatePath = await resolveTemplatePath(templateName);

  if (!templatePath) {
    throw new Error(`Email template "${templateName}" not found.`);
  }

  const template = await fs.readFile(templatePath, 'utf-8');
  templateCache.set(templateName, template);
  return template;
};

export const renderTemplate = async (template: string, variables: Record<string, unknown>): Promise<string> => {
  // Load logo and add to variables if not already present
  if (!variables.logoImage) {
    const logoBase64 = await loadLogoAsBase64();
    variables.logoImage = logoBase64
      ? `<img src="${logoBase64}" alt="Play A Sport Logo" style="max-width: 180px; height: auto; margin-bottom: 10px;" />`
      : '';
  }

  // Add company info if not present
  if (!variables.companyName) {
    variables.companyName = 'Play A Sport';
  }
  if (!variables.website) {
    variables.website = 'playasport.in';
  }
  if (!variables.websiteUrl) {
    variables.websiteUrl = 'https://playasport.in';
  }

  return template.replace(/{{\s*(\w+)\s*}}/g, (_match, token) => {
    const value = variables[token];
    return value === undefined || value === null ? '' : String(value);
  });
};

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

export const sendTemplatedEmail = async ({
  to,
  subject,
  html,
  text,
  template,
  variables = {},
  attachments = [],
}: SendEmailOptions): Promise<string> => {
  let finalHtml = html;

  if (!finalHtml && template) {
    const rawTemplate = await loadTemplate(template);
    finalHtml = await renderTemplate(rawTemplate, variables);
  }

  if (!finalHtml) {
    throw new Error('Email template or HTML content must be provided.');
  }

  // Get email config with settings priority
  const emailConfig = await getEmailConfig();
  
  if (!emailConfig.enabled) {
    logger.info('Email service disabled. Message skipped.', { to, subject });
    return 'Email delivery disabled';
  }

  const mailer = await getTransporter();

  if (!mailer) {
    logger.info('Email mocked send', { to, subject, html: finalHtml, text, attachments: attachments.length });
    return 'Email mocked';
  }

  // Format attachments for nodemailer
  const nodemailerAttachments = attachments.map(att => ({
    filename: att.filename,
    content: att.content,
    contentType: att.contentType || 'application/pdf',
  }));

  const fromAddress = emailConfig.from || emailConfig.username;
  const from =
    emailConfig.fromName?.trim()
      ? `"${emailConfig.fromName.replace(/"/g, '\\"')}" <${fromAddress}>`
      : fromAddress;

  await mailer.sendMail({
    from,
    to,
    subject,
    html: finalHtml,
    text,
    attachments: nodemailerAttachments.length > 0 ? nodemailerAttachments : undefined,
  });

  logger.info('Email queued for delivery', { to, subject, attachments: attachments.length });

  return 'Email queued for delivery';
};

interface CommonVariableOptions {
  name?: string;
  expiryMinutes?: number;
  extras?: Record<string, unknown>;
}

const buildCommonVariables = ({
  name = 'User',
  expiryMinutes = config.otp.expiryMinutes,
  extras = {},
}: CommonVariableOptions = {}) => ({
  name,
  expiryMinutes,
  year: new Date().getFullYear(),
  ...extras,
});

export const sendOtpEmail = async (
  email: string,
  otp: string,
  options: Omit<CommonVariableOptions, 'extras'> = {}
): Promise<string> => {
  const expiryMinutes = options.expiryMinutes ?? config.otp.expiryMinutes;
  const subject = 'Your PlayAsport OTP';
  const text = `Your one-time password (OTP) is ${otp}. It will expire in ${expiryMinutes} minutes. Do not share it with anyone.`;

  return sendTemplatedEmail({
    to: email,
    subject,
    template: 'otp.html',
    text,
    variables: buildCommonVariables({
      ...options,
      expiryMinutes,
      extras: { otp },
    }),
  });
};

export const sendPasswordResetEmail = async (
  email: string,
  otp: string,
  options: Omit<CommonVariableOptions, 'extras'> = {}
): Promise<string> => {
  const expiryMinutes = options.expiryMinutes ?? config.otp.expiryMinutes;
  const subject = 'Reset your PlayAsport password';
  const text = `Use the OTP ${otp} to reset your password. The code expires in ${expiryMinutes} minutes.`;

  return sendTemplatedEmail({
    to: email,
    subject,
    template: 'password-reset.html',
    text,
    variables: buildCommonVariables({
      ...options,
      expiryMinutes,
      extras: { otp },
    }),
  });
};

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

export const sendBookingConfirmationUserEmail = async (
  email: string,
  data: BookingConfirmationEmailData
): Promise<string> => {
  const subject = 'Booking Confirmed - PlayAsport';
  const text = `Your booking ${data.bookingId} has been confirmed for ${data.batchName} at ${data.centerName}.`;

  return sendTemplatedEmail({
    to: email,
    subject,
    template: 'booking-confirmation-user.html',
    text,
    variables: {
      userName: data.userName,
      bookingId: data.bookingId,
      batchName: data.batchName,
      sportName: data.sportName,
      centerName: data.centerName,
      participants: data.participants,
      startDate: data.startDate,
      startTime: data.startTime,
      endTime: data.endTime,
      trainingDays: data.trainingDays,
      amount: data.amount.toFixed(2),
      currency: data.currency,
      paymentId: data.paymentId,
      year: new Date().getFullYear(),
    },
  });
};

export const sendBookingConfirmationCenterEmail = async (
  email: string,
  data: BookingConfirmationEmailData
): Promise<string> => {
  const subject = 'New Booking Received - PlayAsport';
  const text = `You have received a new booking ${data.bookingId} for ${data.batchName} from ${data.userName}.`;

  return sendTemplatedEmail({
    to: email,
    subject,
    template: 'booking-confirmation-center.html',
    text,
    variables: {
      centerName: data.centerName,
      bookingId: data.bookingId,
      batchName: data.batchName,
      sportName: data.sportName,
      userName: data.userName,
      userEmail: data.userEmail || 'N/A',
      participants: data.participants,
      startDate: data.startDate,
      startTime: data.startTime,
      endTime: data.endTime,
      trainingDays: data.trainingDays,
      amount: data.amount.toFixed(2),
      currency: data.currency,
      paymentId: data.paymentId,
      year: new Date().getFullYear(),
    },
  });
};

export const sendBookingConfirmationAdminEmail = async (
  email: string,
  data: BookingConfirmationEmailData
): Promise<string> => {
  const subject = 'New Booking Notification - PlayAsport';
  const text = `A new booking ${data.bookingId} has been confirmed for ${data.batchName} at ${data.centerName}.`;

  return sendTemplatedEmail({
    to: email,
    subject,
    template: 'booking-confirmation-admin.html',
    text,
    variables: {
      bookingId: data.bookingId,
      batchName: data.batchName,
      sportName: data.sportName,
      centerName: data.centerName,
      userName: data.userName,
      userEmail: data.userEmail || 'N/A',
      participants: data.participants,
      startDate: data.startDate,
      startTime: data.startTime,
      endTime: data.endTime,
      trainingDays: data.trainingDays,
      amount: data.amount.toFixed(2),
      currency: data.currency,
      paymentId: data.paymentId,
      year: new Date().getFullYear(),
    },
  });
};

// interface AccountCredentialsEmailData {
//   email: string;
//   password: string;
//   name: string;
// }

/**
 * Send account credentials email to newly created users
 */
export const sendAccountCredentialsEmail = async (
  email: string,
  password: string,
  name: string
): Promise<string> => {
  const subject = 'Welcome to PlayAsport - Your Account Credentials';
  const text = `Welcome to PlayAsport! Your account has been created.\n\nEmail: ${email}\nPassword: ${password}\n\nPlease change your password after first login.`;

  return sendTemplatedEmail({
    to: email,
    subject,
    template: 'account-credentials.html',
    text,
    variables: {
      name: name || 'User',
      email,
      password,
      year: new Date().getFullYear(),
    },
  });
};

