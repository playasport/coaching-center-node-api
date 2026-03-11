"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendBookingConfirmationAdminEmail = exports.sendBookingConfirmationCenterEmail = exports.sendBookingConfirmationUserEmail = exports.sendPasswordResetEmail = exports.sendOtpEmail = exports.sendTemplatedEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
let transporter = null;
const templateCache = new Map();
const TEMPLATE_DIRECTORIES = [
    path_1.default.resolve(process.cwd(), 'dist', 'email', 'templates'),
    path_1.default.resolve(process.cwd(), 'email', 'templates'),
    path_1.default.resolve(process.cwd(), 'src', 'email', 'templates'),
    path_1.default.resolve(__dirname, '..', 'email', 'templates'),
];
const getTransporter = () => {
    if (!env_1.config.email.enabled) {
        return null;
    }
    if (transporter) {
        return transporter;
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
};
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
const renderTemplate = (template, variables) => {
    return template.replace(/{{\s*(\w+)\s*}}/g, (_match, token) => {
        const value = variables[token];
        return value === undefined || value === null ? '' : String(value);
    });
};
const sendTemplatedEmail = async ({ to, subject, html, text, template, variables = {}, }) => {
    let finalHtml = html;
    if (!finalHtml && template) {
        const rawTemplate = await loadTemplate(template);
        finalHtml = renderTemplate(rawTemplate, variables);
    }
    if (!finalHtml) {
        throw new Error('Email template or HTML content must be provided.');
    }
    if (!env_1.config.email.enabled) {
        logger_1.logger.info('Email service disabled. Message skipped.', { to, subject });
        return 'Email delivery disabled';
    }
    const mailer = getTransporter();
    if (!mailer) {
        logger_1.logger.info('Email mocked send', { to, subject, html: finalHtml, text });
        return 'Email mocked';
    }
    await mailer.sendMail({
        from: env_1.config.email.from || env_1.config.email.username,
        to,
        subject,
        html: finalHtml,
        text,
    });
    logger_1.logger.info('Email queued for delivery', { to, subject });
    return 'Email queued for delivery';
};
exports.sendTemplatedEmail = sendTemplatedEmail;
const buildCommonVariables = ({ name = 'User', expiryMinutes = 5, extras = {}, } = {}) => ({
    name,
    expiryMinutes,
    year: new Date().getFullYear(),
    ...extras,
});
const sendOtpEmail = async (email, otp, options = {}) => {
    const subject = 'Your PlayAsport OTP';
    const text = `Your one-time password (OTP) is ${otp}. It will expire in 5 minutes. Do not share it with anyone.`;
    return (0, exports.sendTemplatedEmail)({
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
exports.sendOtpEmail = sendOtpEmail;
const sendPasswordResetEmail = async (email, otp, options = {}) => {
    const subject = 'Reset your PlayAsport password';
    const text = `Use the OTP ${otp} to reset your password. The code expires in 5 minutes.`;
    return (0, exports.sendTemplatedEmail)({
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
//# sourceMappingURL=email.service.js.map