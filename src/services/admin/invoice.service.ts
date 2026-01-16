import puppeteer, { Browser } from 'puppeteer';
import { Types } from 'mongoose';
import { promises as fs } from 'fs';
import path from 'path';
import { BookingModel } from '../../models/booking.model';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';

// Template directories (same as email service)
const TEMPLATE_DIRECTORIES = [
  path.resolve(process.cwd(), 'dist', 'email', 'templates'),
  path.resolve(process.cwd(), 'email', 'templates'),
  path.resolve(process.cwd(), 'src', 'email', 'templates'),
  path.resolve(__dirname, '..', 'email', 'templates'),
];

// Helper function to resolve template path
const resolveTemplatePath = async (templateName: string): Promise<string | null> => {
  for (const dir of TEMPLATE_DIRECTORIES) {
    try {
      const templatePath = path.join(dir, templateName);
      await fs.access(templatePath);
      return templatePath;
    } catch {
      // Continue searching other directories
    }
  }
  return null;
};

// Helper function to load template
const loadTemplate = async (templateName: string): Promise<string> => {
  const templatePath = await resolveTemplatePath(templateName);
  if (!templatePath) {
    throw new Error(`Invoice template "${templateName}" not found.`);
  }
  return await fs.readFile(templatePath, 'utf-8');
};

// Helper function to render template (simple variable replacement)
const renderTemplate = (template: string, variables: Record<string, unknown>): string => {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_match, token) => {
    const value = variables[token];
    return value === undefined || value === null ? '' : String(value);
  });
};

// Helper function to format currency
const formatCurrency = (amount: number, currency: string = 'INR'): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Helper function to format date
const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Helper function to format datetime
const formatDateTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Helper function to load logo and convert to base64
const loadLogoAsBase64 = async (): Promise<string | null> => {
  try {
    // Try multiple possible paths for the logo
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
        const mimeType = 'image/png'; // Assuming PNG format
        return `data:${mimeType};base64,${base64Logo}`;
      } catch {
        // Continue to next path
        continue;
      }
    }
    
    logger.warn('Logo file not found, invoice will be generated without logo');
    return null;
  } catch (error) {
    logger.error('Error loading logo for invoice:', error);
    return null;
  }
};

/**
 * Generate PDF invoice for a booking using HTML template
 * Returns PDF buffer
 */
export const generateBookingInvoice = async (bookingId: string): Promise<Buffer> => {
  let browser: Browser | null = null;
  try {
    const query = Types.ObjectId.isValid(bookingId) ? { _id: bookingId } : { id: bookingId };
    const booking = await BookingModel.findOne({ ...query, is_deleted: false })
      .populate('user', 'id firstName lastName email mobile address')
      .populate('participants', 'id firstName lastName dob gender')
      .populate('batch', 'id name scheduled duration')
      .populate('center', 'id center_name email mobile_number location')
      .populate('sport', 'id name')
      .select('id booking_id amount currency payment priceBreakdown user participants batch center sport createdAt')
      .lean();

    if (!booking) {
      throw new ApiError(404, 'Booking not found');
    }

    const bookingData = booking as any;

    // Prepare template variables
    const userName = bookingData.user
      ? `${bookingData.user.firstName || ''} ${bookingData.user.lastName || ''}`.trim() || 'N/A'
      : 'N/A';
    const userEmail = bookingData.user?.email || 'N/A';
    const userMobile = bookingData.user?.mobile || 'N/A';
    
    const invoiceNumber = bookingData.booking_id || bookingData.id;
    const invoiceDate = formatDate(bookingData.createdAt);
    
    const sportName = bookingData.sport?.name || 'N/A';
    const centerName = bookingData.center?.center_name || 'N/A';
    const batchName = bookingData.batch?.name || 'N/A';
    
    // Format scheduled details
    let startDate = '';
    let timeSlot = '';
    let trainingDays = '';
    let duration = '';
    
    if (bookingData.batch?.scheduled) {
      const scheduled = bookingData.batch.scheduled;
      startDate = scheduled.start_date ? formatDate(scheduled.start_date) : '';
      timeSlot = scheduled.start_time && scheduled.end_time 
        ? `${scheduled.start_time} - ${scheduled.end_time}`
        : '';
      trainingDays = scheduled.training_days && scheduled.training_days.length > 0
        ? scheduled.training_days.join(', ')
        : '';
    }
    
    if (bookingData.batch?.duration) {
      duration = `${bookingData.batch.duration.count} ${bookingData.batch.duration.type}`;
    }
    
    // Format participants list
    const participantsList = bookingData.participants && bookingData.participants.length > 0
      ? bookingData.participants
          .map((p: any, index: number) => {
            const name = `${p.firstName || ''} ${p.lastName || ''}`.trim();
            return `<li>${index + 1}. ${name || 'Participant'}</li>`;
          })
          .join('')
      : '<li>N/A</li>';
    
    // Payment details
    const paymentStatus = bookingData.payment?.status || 'pending';
    const paymentStatusDisplay = paymentStatus === 'success' ? 'paid' : paymentStatus.toUpperCase();
    const paymentStatusClass = paymentStatus === 'success' ? 'success' : 'pending';
    const paymentMethod = bookingData.payment?.payment_method 
      ? bookingData.payment.payment_method.toUpperCase()
      : 'N/A';
    const orderId = bookingData.payment?.razorpay_order_id || 'N/A';
    const paidAt = bookingData.payment?.paid_at 
      ? formatDateTime(bookingData.payment.paid_at)
      : 'N/A';
    
    // Format user address
    let userAddress = '';
    if (bookingData.user?.address) {
      const addr = bookingData.user.address;
      const addressParts: string[] = [];
      if (addr.line1) addressParts.push(addr.line1);
      if (addr.line2) addressParts.push(addr.line2);
      if (addr.area) addressParts.push(addr.area);
      if (addr.city) addressParts.push(addr.city);
      if (addr.state) addressParts.push(addr.state);
      if (addr.pincode) addressParts.push(addr.pincode);
      if (addr.country) addressParts.push(addr.country);
      userAddress = addressParts.join(', ') || 'N/A';
    } else {
      userAddress = 'N/A';
    }
    
    // Price breakdown
    const priceBreakdown = bookingData.priceBreakdown;
    const batchAmount = priceBreakdown?.batch_amount 
      ? formatCurrency(priceBreakdown.batch_amount, bookingData.currency)
      : formatCurrency(bookingData.amount, bookingData.currency);
    const platformFee = priceBreakdown?.platform_fee 
      ? formatCurrency(priceBreakdown.platform_fee, bookingData.currency)
      : '₹0.00';
    const subtotal = priceBreakdown?.subtotal 
      ? formatCurrency(priceBreakdown.subtotal, bookingData.currency)
      : formatCurrency(bookingData.amount, bookingData.currency);
    const gstAmount = priceBreakdown?.gst_amount 
      ? formatCurrency(priceBreakdown.gst_amount, bookingData.currency)
      : '₹0.00';
    const gstPercentage = priceBreakdown?.gst_percentage || 0;
    const totalAmount = formatCurrency(bookingData.amount, bookingData.currency);
    const year = new Date().getFullYear();

    // Load logo and convert to base64
    const logoBase64 = await loadLogoAsBase64();
    const logoImage = logoBase64
      ? `<img src="${logoBase64}" alt="PlayAsport Logo" class="inpany-logo" />`
      : '';

    // Load and render HTML template
    const template = await loadTemplate('invoice.html');
    const html = renderTemplate(template, {
      invoiceNumber,
      invoiceDate,
      userName,
      userEmail,
      userMobile,
      userAddress,
      sportName,
      centerName,
      batchName,
      startDate,
      timeSlot,
      trainingDays,
      duration,
      participantsList,
      paymentStatus: paymentStatusDisplay,
      paymentStatusClass,
      paymentMethod,
      orderId,
      paidAt,
      batchAmount,
      platformFee,
      subtotal,
      gstAmount,
      gstPercentage,
      totalAmount,
      year,
      logoImage,
    });

    // Launch Puppeteer browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'], // Required for some environments
    });

    const page = await browser.newPage();
    
    // Set content and wait for rendering
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
      },
    });

    await browser.close();
    browser = null;

    return Buffer.from(pdfBuffer);
  } catch (error) {
    // Ensure browser is closed even on error
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        logger.error('Error closing browser:', closeError);
      }
    }
    
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to generate booking invoice:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

