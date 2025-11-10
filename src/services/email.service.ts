import nodemailer, { Transporter } from 'nodemailer';
import { promises as fs } from 'fs';
import path from 'path';
import { config } from '../config/env';
import { logger } from '../utils/logger';

let transporter: Transporter | null = null;
const templateCache = new Map<string, string>();

const TEMPLATE_DIRECTORIES = [
  path.resolve(process.cwd(), 'dist', 'email', 'templates'),
  path.resolve(process.cwd(), 'email', 'templates'),
  path.resolve(process.cwd(), 'src', 'email', 'templates'),
  path.resolve(__dirname, '..', 'email', 'templates'),
];

const getTransporter = (): Transporter | null => {
  if (!config.email.enabled) {
    return null;
  }

  if (transporter) {
    return transporter;
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

const loadTemplate = async (templateName: string): Promise<string> => {
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

const renderTemplate = (template: string, variables: Record<string, unknown>): string => {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_match, token) => {
    const value = variables[token];
    return value === undefined || value === null ? '' : String(value);
  });
};

interface SendEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  variables?: Record<string, unknown>;
}

export const sendTemplatedEmail = async ({
  to,
  subject,
  html,
  text,
  template,
  variables = {},
}: SendEmailOptions): Promise<string> => {
  let finalHtml = html;

  if (!finalHtml && template) {
    const rawTemplate = await loadTemplate(template);
    finalHtml = renderTemplate(rawTemplate, variables);
  }

  if (!finalHtml) {
    throw new Error('Email template or HTML content must be provided.');
  }

  if (!config.email.enabled) {
    logger.info('Email service disabled. Message skipped.', { to, subject });
    return 'Email delivery disabled';
  }

  const mailer = getTransporter();

  if (!mailer) {
    logger.info('Email mocked send', { to, subject, html: finalHtml, text });
    return 'Email mocked';
  }

  await mailer.sendMail({
    from: config.email.from || config.email.username,
    to,
    subject,
    html: finalHtml,
    text,
  });

  logger.info('Email queued for delivery', { to, subject });

  return 'Email queued for delivery';
};

interface CommonVariableOptions {
  name?: string;
  expiryMinutes?: number;
  extras?: Record<string, unknown>;
}

const buildCommonVariables = ({
  name = 'User',
  expiryMinutes = 5,
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
  const subject = 'Your PlayAsport OTP';
  const text = `Your one-time password (OTP) is ${otp}. It will expire in 5 minutes. Do not share it with anyone.`;

  return sendTemplatedEmail({
    to: email,
    subject,
    template: 'otp.html',
    text,
    variables: buildCommonVariables({
      ...options,
      extras: { otp },
    }),
  });
};

export const sendPasswordResetEmail = async (
  email: string,
  otp: string,
  options: Omit<CommonVariableOptions, 'extras'> = {}
): Promise<string> => {
  const subject = 'Reset your PlayAsport password';
  const text = `Use the OTP ${otp} to reset your password. The code expires in 5 minutes.`;

  return sendTemplatedEmail({
    to: email,
    subject,
    template: 'password-reset.html',
    text,
    variables: buildCommonVariables({
      ...options,
      extras: { otp },
    }),
  });
};
