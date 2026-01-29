import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../utils/logger';
import { loadTemplate, renderTemplate } from '../../services/common/email.service';
import path from 'path';
import fs from 'fs/promises';

/**
 * Get list of all available email templates
 */
export const getEmailTemplatesList = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const templatesDir = path.join(__dirname, '../../email/templates');
    const files = await fs.readdir(templatesDir);
    const templates = files
      .filter(file => file.endsWith('.html'))
      .map(file => ({
        name: file,
        previewUrl: `/api/v1/test/email-templates/${file.replace('.html', '')}`,
      }));

    const response = new ApiResponse(200, { templates }, 'Email templates list retrieved successfully');
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Get sample data for a specific template
 */
const getSampleDataForTemplate = (templateName: string): Record<string, unknown> => {
  const currentYear = new Date().getFullYear();
  const baseData = {
    companyName: 'Play A Sport',
    website: 'playasport.in',
    websiteUrl: 'https://playasport.in',
    year: currentYear,
  };

  switch (templateName) {
    case 'booking-approved-user':
      return {
        ...baseData,
        userName: 'John Doe',
        batchName: 'Cricket Advanced Training',
        centerName: 'Elite Sports Academy',
        bookingId: 'PS-2026-0001',
      };

    case 'booking-request-sent-user':
      return {
        ...baseData,
        userName: 'John Doe',
        batchName: 'Cricket Advanced Training',
        centerName: 'Elite Sports Academy',
        bookingId: 'PS-2026-0001',
      };

    case 'booking-request-academy':
      return {
        ...baseData,
        centerName: 'Elite Sports Academy',
        batchName: 'Cricket Advanced Training',
        userName: 'John Doe',
        participants: 'John Doe, Jane Doe',
        bookingId: 'PS-2026-0001',
      };

    case 'booking-rejected-user':
      return {
        ...baseData,
        userName: 'John Doe',
        batchName: 'Cricket Advanced Training',
        centerName: 'Elite Sports Academy',
        bookingId: 'PS-2026-0001',
        reason: 'Batch is full. Please try another batch.',
      };

    case 'booking-cancelled-user':
      return {
        ...baseData,
        userName: 'John Doe',
        batchName: 'Cricket Advanced Training',
        centerName: 'Elite Sports Academy',
        bookingId: 'PS-2026-0001',
        reason: 'Personal reasons',
      };

    case 'booking-cancelled-academy':
      return {
        ...baseData,
        centerName: 'Elite Sports Academy',
        batchName: 'Cricket Advanced Training',
        userName: 'John Doe',
        bookingId: 'PS-2026-0001',
        reason: 'Personal reasons',
      };

    case 'booking-cancelled-admin':
      return {
        ...baseData,
        centerName: 'Elite Sports Academy',
        batchName: 'Cricket Advanced Training',
        userName: 'John Doe',
        bookingId: 'PS-2026-0001',
        reason: 'Personal reasons',
      };

    case 'booking-confirmation-user':
      return {
        ...baseData,
        userName: 'John Doe',
        batchName: 'Cricket Advanced Training',
        sportName: 'Cricket',
        centerName: 'Elite Sports Academy',
        participants: 'John Doe, Jane Doe',
        startDate: '2026-02-01',
        startTime: '06:00 AM',
        endTime: '08:00 AM',
        trainingDays: 'Monday, Wednesday, Friday',
        amount: '5000.00',
        currency: 'INR',
        bookingId: 'PS-2026-0001',
        paymentId: 'pay_1234567890',
      };

    case 'booking-confirmation-center':
      return {
        ...baseData,
        centerName: 'Elite Sports Academy',
        batchName: 'Cricket Advanced Training',
        sportName: 'Cricket',
        userName: 'John Doe',
        participants: 'John Doe, Jane Doe',
        startDate: '2026-02-01',
        startTime: '06:00 AM',
        endTime: '08:00 AM',
        trainingDays: 'Monday, Wednesday, Friday',
        amount: '5000.00',
        currency: 'INR',
        bookingId: 'PS-2026-0001',
        paymentId: 'pay_1234567890',
      };

    case 'booking-confirmation-admin':
      return {
        ...baseData,
        centerName: 'Elite Sports Academy',
        batchName: 'Cricket Advanced Training',
        sportName: 'Cricket',
        userName: 'John Doe',
        bookingId: 'PS-2026-0001',
        amount: '5000.00',
        currency: 'INR',
      };

    case 'academy-welcome':
      return {
        ...baseData,
        name: 'Rajesh Kumar',
        email: 'rajesh@elitesports.com',
        mobile: '+91 9876543210',
        registrationDate: '2026-01-15',
      };

    case 'academy-registration-admin':
      return {
        ...baseData,
        name: 'Rajesh Kumar',
        email: 'rajesh@elitesports.com',
        mobile: '+91 9876543210',
        registrationDate: '2026-01-15',
      };

    case 'user-registration-admin':
      return {
        ...baseData,
        name: 'John Doe',
        email: 'john.doe@example.com',
        mobile: '+91 9876543210',
        registrationDate: '2026-01-15',
      };

    case 'account-credentials':
      return {
        ...baseData,
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'TempPassword123!',
        loginUrl: 'https://playasport.in/login',
      };

    case 'otp':
      return {
        ...baseData,
        name: 'John Doe',
        otp: '123456',
        expiryMinutes: 10,
      };

    case 'password-reset':
      return {
        ...baseData,
        name: 'John Doe',
        resetLink: 'https://playasport.in/reset-password?token=abc123xyz',
        expiryMinutes: 30,
      };

    case 'invoice':
      return {
        ...baseData,
        invoiceNumber: 'INV-2026-0001',
        invoiceDate: '15 January 2026',
        bookingId: 'PS-2026-0001',
        userName: 'John Doe',
        userEmail: 'john.doe@example.com',
        userMobile: '+91 9876543210',
        userAddress: '123 Main Street, Mumbai, Maharashtra 400001',
        centerName: 'Elite Sports Academy',
        centerAddress: '123 Sports Street, Mumbai, Maharashtra 400001',
        centerEmail: 'info@elitesports.com',
        centerMobile: '+91 9876543210',
        batchName: 'Cricket Advanced Training',
        sportName: 'Cricket',
        participantsList: '<li>1. John Doe</li><li>2. Jane Doe</li>',
        startDate: '1 February 2026',
        timeSlot: '06:00 AM - 08:00 AM',
        trainingDays: 'Monday, Wednesday, Friday',
        duration: '2 hours',
        batchAmount: '₹4,000.00',
        platformFee: '₹300.00',
        subtotal: '₹5,300.00',
        gstAmount: '₹90.00',
        gstPercentage: 18,
        totalAmount: '₹5,390.00',
        currency: 'INR',
        paymentId: 'pay_1234567890',
        paymentDate: '15 January 2026',
        paymentMethod: 'Razorpay',
        paymentStatus: 'Paid',
        paymentStatusClass: 'paid',
        orderId: 'order_1234567890',
        paidAt: '15 January 2026, 10:30 AM',
      };

    case 'payout-account-created':
      return {
        ...baseData,
        academyName: 'Elite Sports Academy',
        accountHolderName: 'Rajesh Kumar',
        accountNumber: '****1234',
        ifscCode: 'HDFC0001234',
        bankName: 'HDFC Bank',
        accountType: 'Current',
        status: 'pending_verification',
      };

    case 'payout-account-activated':
      return {
        ...baseData,
        academyName: 'Elite Sports Academy',
        accountHolderName: 'Rajesh Kumar',
        accountNumber: '****1234',
        ifscCode: 'HDFC0001234',
        bankName: 'HDFC Bank',
      };

    default:
      return baseData;
  }
};

/**
 * Preview a specific email template
 */
export const previewEmailTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { templateName } = req.params;

    if (!templateName) {
      throw new ApiError(400, 'Template name is required');
    }

    const templateFileName = `${templateName}.html`;
    const template = await loadTemplate(templateFileName);
    const sampleData = getSampleDataForTemplate(templateName);
    const renderedHtml = await renderTemplate(template, sampleData);

    // Set content type to HTML
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderedHtml);
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      logger.error('Failed to preview email template:', {
        templateName: req.params.templateName,
        error: error instanceof Error ? error.message : error,
      });
      next(new ApiError(500, 'Failed to preview email template'));
    }
  }
};
