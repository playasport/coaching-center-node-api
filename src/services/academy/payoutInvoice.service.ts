import puppeteer, { Browser } from 'puppeteer';
import { Types } from 'mongoose';
import { promises as fs } from 'fs';
import path from 'path';
import { PayoutModel } from '../../models/payout.model';
import { BookingModel } from '../../models/booking.model';
import { UserModel } from '../../models/user.model';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { renderTemplate as emailRenderTemplate } from '../common/email.service';

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

// Use email service renderTemplate instead of local implementation

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
      }
    }
    return null;
  } catch (error) {
    logger.error('Error loading logo:', error);
    return null;
  }
};

/**
 * Generate PDF invoice for a payout using HTML template
 * Returns PDF buffer
 */
export const generatePayoutInvoice = async (payoutId: string, academyUserId: string): Promise<Buffer> => {
  let browser: Browser | null = null;
  try {
    // Find academy user ObjectId
    const academyUser = await UserModel.findOne({ id: academyUserId }).select('_id').lean();
    if (!academyUser) {
      throw new ApiError(404, 'Academy user not found');
    }

    // Find payout and verify it belongs to the academy user
    const payout = await PayoutModel.findOne({
      id: payoutId,
      academy_user: academyUser._id,
    })
      .populate({
        path: 'booking',
        select: 'id booking_id amount currency payment priceBreakdown createdAt',
        populate: [
          { path: 'user', select: 'id firstName lastName email mobile address' },
          { path: 'participants', select: 'id firstName lastName dob gender' },
          { path: 'batch', select: 'id name scheduled duration' },
          { path: 'center', select: 'id center_name email mobile_number location' },
          { path: 'sport', select: 'id name' },
        ],
      })
      .populate('transaction', 'id razorpay_payment_id status amount currency')
      .populate('academy_payout_account', 'id razorpay_account_id activation_status')
      .populate('academy_user', 'id firstName lastName email mobile')
      .lean();

    if (!payout) {
      throw new ApiError(404, 'Payout not found or does not belong to you');
    }

    const payoutData = payout as any;

    // Get booking data
    const booking = payoutData.booking;
    if (!booking) {
      throw new ApiError(404, 'Booking not found for this payout');
    }

    // Fetch booking with full populated data
    // booking can be ObjectId or populated object
    let bookingObjectId: Types.ObjectId;
    if (Types.ObjectId.isValid(booking._id)) {
      bookingObjectId = booking._id as Types.ObjectId;
    } else if (booking.id) {
      const bookingDoc = await BookingModel.findOne({ id: booking.id }).select('_id').lean();
      if (!bookingDoc) {
        throw new ApiError(404, 'Booking not found');
      }
      bookingObjectId = bookingDoc._id as Types.ObjectId;
    } else {
      throw new ApiError(404, 'Invalid booking reference');
    }

    const fullBooking = await BookingModel.findById(bookingObjectId)
      .populate('user', 'id firstName lastName email mobile address')
      .populate('participants', 'id firstName lastName dob gender')
      .populate('batch', 'id name scheduled duration')
      .populate('center', 'id center_name email mobile_number location')
      .populate('sport', 'id name')
      .lean();

    if (!fullBooking) {
      throw new ApiError(404, 'Booking details not found');
    }

    // Get center details from populated booking
    const center = fullBooking.center as any;

    // Prepare template variables
    const academyName = payoutData.academy_user
      ? `${payoutData.academy_user.firstName || ''} ${payoutData.academy_user.lastName || ''}`.trim() || 'Academy'
      : 'Academy';
    const academyEmail = payoutData.academy_user?.email || 'N/A';
    const academyMobile = payoutData.academy_user?.mobile || 'N/A';

    // Format center address
    let centerAddress = '';
    if (center?.location?.address) {
      const addr = center.location.address;
      const addressParts: string[] = [];
      if (addr.line1) addressParts.push(addr.line1);
      if (addr.line2) addressParts.push(addr.line2);
      if (addr.city) addressParts.push(addr.city);
      if (addr.state) addressParts.push(addr.state);
      if (addr.pincode) addressParts.push(addr.pincode);
      if (addr.country) addressParts.push(addr.country);
      centerAddress = addressParts.join(', ') || 'N/A';
    } else {
      centerAddress = 'N/A';
    }

    const invoiceNumber = `PAYOUT-${payoutData.id.slice(0, 8).toUpperCase()}`;
    const invoiceDate = formatDate(payoutData.createdAt);

    // Get booking details from fully populated booking
    const bookingIdStr = fullBooking.booking_id || fullBooking.id || 'N/A';
    const sportName = (fullBooking.sport as any)?.name || 'N/A';
    const centerName = center?.center_name || 'N/A';
    const batchName = (fullBooking.batch as any)?.name || 'N/A';

    // Format scheduled details
    let startDate = '';
    let timeSlot = '';
    let trainingDays = '';
    let duration = '';

    const batchData = fullBooking.batch as any;
    if (batchData?.scheduled) {
      const scheduled = batchData.scheduled;
      startDate = scheduled.start_date ? formatDate(scheduled.start_date) : '';
      timeSlot = scheduled.start_time && scheduled.end_time
        ? `${scheduled.start_time} - ${scheduled.end_time}`
        : '';
      trainingDays = scheduled.training_days && scheduled.training_days.length > 0
        ? scheduled.training_days.join(', ')
        : '';
    }

    if (batchData?.duration) {
      duration = `${batchData.duration.count} ${batchData.duration.type}`;
    }

    // Format participants list
    const participants = Array.isArray(fullBooking.participants) ? fullBooking.participants : [];
    const participantsList = participants.length > 0
      ? participants
          .map((p: any, index: number) => {
            const name = `${p.firstName || ''} ${p.lastName || ''}`.trim();
            return `<li>${index + 1}. ${name || 'Participant'}</li>`;
          })
          .join('')
      : '<li>N/A</li>';

    // Payout status
    const payoutStatus = payoutData.status || 'pending';
    const payoutStatusDisplay = payoutStatus === 'completed' ? 'Paid' : payoutStatus.toUpperCase();
    const payoutStatusClass = payoutStatus === 'completed' ? 'success' : payoutStatus === 'failed' ? 'failed' : 'pending';
    
    const transferId = payoutData.razorpay_transfer_id || 'N/A';
    const processedAt = payoutData.processed_at
      ? formatDateTime(payoutData.processed_at)
      : 'N/A';

    // Amount breakdown for payout
    const totalBookingAmount = formatCurrency(payoutData.amount, payoutData.currency);
    const commissionAmount = formatCurrency(payoutData.commission_amount, payoutData.currency);
    const commissionRate = (payoutData.commission_rate * 100).toFixed(2);
    const payoutAmount = formatCurrency(payoutData.payout_amount, payoutData.currency);
    const year = new Date().getFullYear();

    // Load logo and convert to base64
    const logoBase64 = await loadLogoAsBase64();
    const logoImage = logoBase64
      ? `<img src="${logoBase64}" alt="PlayAsport Logo" class="inpany-logo" />`
      : '';

    // Load and render HTML template (using payout-specific template)
    const template = await loadTemplate('payout-invoice.html');
    const html = await emailRenderTemplate(template, {
      invoiceNumber,
      invoiceDate,
      userName: academyName,
      userEmail: academyEmail,
      userMobile: academyMobile,
      userAddress: centerAddress,
      sportName,
      centerName,
      batchName,
      startDate,
      timeSlot,
      trainingDays,
      duration,
      participantsList,
      paymentStatus: payoutStatusDisplay,
      paymentStatusClass: payoutStatusClass,
      paymentMethod: 'Razorpay Transfer',
      orderId: transferId,
      paidAt: processedAt,
      payoutAmount: payoutAmount,
      commissionAmount: commissionAmount,
      commissionRate: `${commissionRate}%`,
      totalBookingAmount: totalBookingAmount,
      bookingId: bookingIdStr,
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
    logger.error('Failed to generate payout invoice:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      payoutId,
      academyUserId,
    });
    throw new ApiError(500, error instanceof Error ? error.message : t('errors.internalServerError'));
  }
};
