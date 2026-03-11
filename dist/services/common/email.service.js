"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAccountCredentialsEmail = exports.sendBookingConfirmationAdminEmail = exports.sendBookingConfirmationCenterEmail = exports.sendBookingConfirmationUserEmail = exports.sendPasswordResetEmail = exports.sendOtpEmail = exports.sendTemplatedEmail = exports.renderTemplate = exports.loadTemplate = exports.resetEmailTransporter = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const env_1 = require("../../config/env");
const logger_1 = require("../../utils/logger");
const settings_service_1 = require("./settings.service");
let transporter = null;
let transporterInitializationPromise = null;
const templateCache = new Map();
let logoBase64Cache = null;
const TEMPLATE_DIRECTORIES = [
    path_1.default.resolve(process.cwd(), 'dist', 'email', 'templates'),
    path_1.default.resolve(process.cwd(), 'email', 'templates'),
    path_1.default.resolve(process.cwd(), 'src', 'email', 'templates'),
    path_1.default.resolve(__dirname, '..', 'email', 'templates'),
];
/**
 * Load logo as base64 for email templates
 */
const loadLogoAsBase64 = async () => {
    if (logoBase64Cache) {
        return logoBase64Cache;
    }
    try {
        const logoPaths = [
            path_1.default.resolve(process.cwd(), 'src', 'statics', 'images', 'logo.png'),
            path_1.default.resolve(process.cwd(), 'dist', 'statics', 'images', 'logo.png'),
            path_1.default.resolve(__dirname, '..', '..', 'statics', 'images', 'logo.png'),
            path_1.default.resolve(__dirname, '..', 'statics', 'images', 'logo.png'),
        ];
        for (const logoPath of logoPaths) {
            try {
                await fs_1.promises.access(logoPath);
                const logoBuffer = await fs_1.promises.readFile(logoPath);
                const base64Logo = logoBuffer.toString('base64');
                const mimeType = 'image/png';
                logoBase64Cache = `data:${mimeType};base64,${base64Logo}`;
                return logoBase64Cache;
            }
            catch {
                continue;
            }
        }
        logger_1.logger.warn('Logo file not found for email templates');
        return null;
    }
    catch (error) {
        logger_1.logger.error('Error loading logo for email templates:', error);
        return null;
    }
};
const getTransporter = async () => {
    // If transporter already exists, return it
    if (transporter) {
        return transporter;
    }
    // If initialization is in progress, wait for it
    if (transporterInitializationPromise) {
        return transporterInitializationPromise;
    }
    // Initialize transporter with settings priority
    transporterInitializationPromise = (async () => {
        try {
            const emailConfig = await (0, settings_service_1.getEmailConfig)();
            if (!emailConfig.enabled) {
                return null;
            }
            if (!emailConfig.host || !emailConfig.username || !emailConfig.password) {
                return null;
            }
            transporter = nodemailer_1.default.createTransport({
                host: emailConfig.host,
                port: emailConfig.port,
                secure: emailConfig.secure,
                auth: {
                    user: emailConfig.username,
                    pass: emailConfig.password,
                },
            });
            return transporter;
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize email transporter with settings, using env fallback', error);
            // Fallback to env
            if (!env_1.config.email.enabled) {
                return null;
            }
            if (!env_1.config.email.host || !env_1.config.email.username || !env_1.config.email.password) {
                return null;
            }
            transporter = nodemailer_1.default.createTransport({
                host: env_1.config.email.host,
                port: env_1.config.email.port,
                secure: env_1.config.email.secure,
                auth: {
                    user: env_1.config.email.username,
                    pass: env_1.config.email.password,
                },
            });
            return transporter;
        }
        finally {
            transporterInitializationPromise = null;
        }
    })();
    return transporterInitializationPromise;
};
/**
 * Reset email transporter (useful when credentials are updated)
 */
const resetEmailTransporter = () => {
    transporter = null;
    transporterInitializationPromise = null;
};
exports.resetEmailTransporter = resetEmailTransporter;
const resolveTemplatePath = async (templateName) => {
    for (const dir of TEMPLATE_DIRECTORIES) {
        const filePath = path_1.default.join(dir, templateName);
        try {
            await fs_1.promises.access(filePath);
            return filePath;
        }
        catch {
            // Continue searching other directories
        }
    }
    return null;
};
const loadTemplate = async (templateName) => {
    if (templateCache.has(templateName)) {
        return templateCache.get(templateName);
    }
    const templatePath = await resolveTemplatePath(templateName);
    if (!templatePath) {
        throw new Error(`Email template "${templateName}" not found.`);
    }
    const template = await fs_1.promises.readFile(templatePath, 'utf-8');
    templateCache.set(templateName, template);
    return template;
};
exports.loadTemplate = loadTemplate;
const renderTemplate = async (template, variables) => {
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
exports.renderTemplate = renderTemplate;
const sendTemplatedEmail = async ({ to, subject, html, text, template, variables = {}, attachments = [], }) => {
    let finalHtml = html;
    if (!finalHtml && template) {
        const rawTemplate = await (0, exports.loadTemplate)(template);
        finalHtml = await (0, exports.renderTemplate)(rawTemplate, variables);
    }
    if (!finalHtml) {
        throw new Error('Email template or HTML content must be provided.');
    }
    // Get email config with settings priority
    const emailConfig = await (0, settings_service_1.getEmailConfig)();
    if (!emailConfig.enabled) {
        logger_1.logger.info('Email service disabled. Message skipped.', { to, subject });
        return 'Email delivery disabled';
    }
    const mailer = await getTransporter();
    if (!mailer) {
        logger_1.logger.info('Email mocked send', { to, subject, html: finalHtml, text, attachments: attachments.length });
        return 'Email mocked';
    }
    // Format attachments for nodemailer
    const nodemailerAttachments = attachments.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType || 'application/pdf',
    }));
    const fromAddress = emailConfig.from || emailConfig.username;
    const from = emailConfig.fromName?.trim()
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
    logger_1.logger.info('Email queued for delivery', { to, subject, attachments: attachments.length });
    return 'Email queued for delivery';
};
exports.sendTemplatedEmail = sendTemplatedEmail;
const buildCommonVariables = ({ name = 'User', expiryMinutes = env_1.config.otp.expiryMinutes, extras = {}, } = {}) => ({
    name,
    expiryMinutes,
    year: new Date().getFullYear(),
    ...extras,
});
const sendOtpEmail = async (email, otp, options = {}) => {
    const expiryMinutes = options.expiryMinutes ?? env_1.config.otp.expiryMinutes;
    const subject = 'Your PlayAsport OTP';
    const text = `Your one-time password (OTP) is ${otp}. It will expire in ${expiryMinutes} minutes. Do not share it with anyone.`;
    return (0, exports.sendTemplatedEmail)({
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
exports.sendOtpEmail = sendOtpEmail;
const sendPasswordResetEmail = async (email, otp, options = {}) => {
    const expiryMinutes = options.expiryMinutes ?? env_1.config.otp.expiryMinutes;
    const subject = 'Reset your PlayAsport password';
    const text = `Use the OTP ${otp} to reset your password. The code expires in ${expiryMinutes} minutes.`;
    return (0, exports.sendTemplatedEmail)({
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
exports.sendPasswordResetEmail = sendPasswordResetEmail;
const sendBookingConfirmationUserEmail = async (email, data) => {
    const subject = 'Booking Confirmed - PlayAsport';
    const text = `Your booking ${data.bookingId} has been confirmed for ${data.batchName} at ${data.centerName}.`;
    return (0, exports.sendTemplatedEmail)({
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
exports.sendBookingConfirmationUserEmail = sendBookingConfirmationUserEmail;
const sendBookingConfirmationCenterEmail = async (email, data) => {
    const subject = 'New Booking Received - PlayAsport';
    const text = `You have received a new booking ${data.bookingId} for ${data.batchName} from ${data.userName}.`;
    return (0, exports.sendTemplatedEmail)({
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
exports.sendBookingConfirmationCenterEmail = sendBookingConfirmationCenterEmail;
const sendBookingConfirmationAdminEmail = async (email, data) => {
    const subject = 'New Booking Notification - PlayAsport';
    const text = `A new booking ${data.bookingId} has been confirmed for ${data.batchName} at ${data.centerName}.`;
    return (0, exports.sendTemplatedEmail)({
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
exports.sendBookingConfirmationAdminEmail = sendBookingConfirmationAdminEmail;
// interface AccountCredentialsEmailData {
//   email: string;
//   password: string;
//   name: string;
// }
/**
 * Send account credentials email to newly created users
 */
const sendAccountCredentialsEmail = async (email, password, name) => {
    const subject = 'Welcome to PlayAsport - Your Account Credentials';
    const text = `Welcome to PlayAsport! Your account has been created.\n\nEmail: ${email}\nPassword: ${password}\n\nPlease change your password after first login.`;
    return (0, exports.sendTemplatedEmail)({
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
exports.sendAccountCredentialsEmail = sendAccountCredentialsEmail;
//# sourceMappingURL=email.service.js.map