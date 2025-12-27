import PDFDocument from 'pdfkit';
import { Types } from 'mongoose';
import { BookingModel } from '../../models/booking.model';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';

/**
 * Generate PDF invoice for a booking
 * Returns PDF buffer
 */
export const generateBookingInvoice = async (bookingId: string): Promise<Buffer> => {
  try {
    const query = Types.ObjectId.isValid(bookingId) ? { _id: bookingId } : { id: bookingId };
    const booking = await BookingModel.findOne({ ...query, is_deleted: false })
      .populate('user', 'id firstName lastName email mobile')
      .populate('participants', 'id firstName lastName dob gender')
      .populate('batch', 'id name scheduled duration')
      .populate('center', 'id center_name email mobile_number location')
      .populate('sport', 'id name')
      .lean();

    if (!booking) {
      throw new ApiError(404, 'Booking not found');
    }

    const bookingData = booking as any;

    // Create PDF document
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {});

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

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('INVOICE', 50, 50, { align: 'left' });
    
    // Invoice details
    const invoiceNumber = bookingData.booking_id || bookingData.id;
    const invoiceDate = formatDate(bookingData.createdAt);
    
    doc.fontSize(10).font('Helvetica').text(`Invoice #: ${invoiceNumber}`, 400, 50, { align: 'right' });
    doc.text(`Date: ${invoiceDate}`, 400, 70, { align: 'right' });

    // Company/Platform Info (you can customize this)
    doc.fontSize(12).font('Helvetica-Bold').text('PlayAsport', 50, 120);
    doc.fontSize(10).font('Helvetica').text('Coaching Center Platform', 50, 140);
    
    // Billing To section
    let yPos = 120;
    doc.fontSize(12).font('Helvetica-Bold').text('Bill To:', 400, yPos);
    yPos += 20;
    doc.fontSize(10).font('Helvetica');
    
    const userName = bookingData.user
      ? `${bookingData.user.firstName || ''} ${bookingData.user.lastName || ''}`.trim()
      : 'N/A';
    doc.text(userName, 400, yPos);
    yPos += 15;
    
    if (bookingData.user?.email) {
      doc.text(`Email: ${bookingData.user.email}`, 400, yPos);
      yPos += 15;
    }
    if (bookingData.user?.mobile) {
      doc.text(`Mobile: ${bookingData.user.mobile}`, 400, yPos);
      yPos += 15;
    }

    // Line separator
    doc.moveTo(50, 200).lineTo(550, 200).stroke();

    // Booking Details
    yPos = 220;
    doc.fontSize(14).font('Helvetica-Bold').text('Booking Details', 50, yPos);
    yPos += 25;
    
    doc.fontSize(10).font('Helvetica');
    doc.text(`Sport: ${bookingData.sport?.name || 'N/A'}`, 50, yPos);
    yPos += 15;
    
    doc.text(`Center: ${bookingData.center?.center_name || 'N/A'}`, 50, yPos);
    yPos += 15;
    
    doc.text(`Batch: ${bookingData.batch?.name || 'N/A'}`, 50, yPos);
    yPos += 15;
    
    if (bookingData.batch?.scheduled) {
      const scheduled = bookingData.batch.scheduled;
      doc.text(`Start Date: ${formatDate(scheduled.start_date)}`, 50, yPos);
      yPos += 15;
      doc.text(`Time: ${scheduled.start_time} - ${scheduled.end_time}`, 50, yPos);
      yPos += 15;
      if (scheduled.training_days && scheduled.training_days.length > 0) {
        doc.text(`Training Days: ${scheduled.training_days.join(', ')}`, 50, yPos);
        yPos += 15;
      }
    }
    
    if (bookingData.batch?.duration) {
      doc.text(`Duration: ${bookingData.batch.duration.count} ${bookingData.batch.duration.type}`, 50, yPos);
      yPos += 15;
    }

    // Participants
    yPos += 10;
    doc.fontSize(12).font('Helvetica-Bold').text('Participants:', 50, yPos);
    yPos += 20;
    
    if (bookingData.participants && bookingData.participants.length > 0) {
      bookingData.participants.forEach((participant: any, index: number) => {
        const participantName = `${participant.firstName || ''} ${participant.lastName || ''}`.trim();
        doc.fontSize(10).font('Helvetica').text(`${index + 1}. ${participantName}`, 50, yPos);
        yPos += 15;
      });
    } else {
      doc.text('N/A', 50, yPos);
      yPos += 15;
    }

    // Payment Details Table
    yPos += 20;
    doc.fontSize(14).font('Helvetica-Bold').text('Payment Details', 50, yPos);
    yPos += 25;

    // Table header
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Description', 50, yPos);
    doc.text('Amount', 450, yPos, { align: 'right', width: 100 });
    yPos += 20;

    // Table line
    doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
    yPos += 10;

    // Table rows
    doc.fontSize(10).font('Helvetica');
    doc.text('Booking Amount', 50, yPos);
    doc.text(formatCurrency(bookingData.amount, bookingData.currency), 450, yPos, { align: 'right', width: 100 });
    yPos += 20;

    // Payment status
    yPos += 10;
    doc.fontSize(10).font('Helvetica');
    const paymentStatus = bookingData.payment?.status || 'pending';
    doc.text(`Payment Status: ${paymentStatus.toUpperCase()}`, 50, yPos);
    yPos += 15;
    
    if (bookingData.payment?.payment_method) {
      doc.text(`Payment Method: ${bookingData.payment.payment_method.toUpperCase()}`, 50, yPos);
      yPos += 15;
    }
    
    if (bookingData.payment?.razorpay_order_id) {
      doc.text(`Order ID: ${bookingData.payment.razorpay_order_id}`, 50, yPos);
      yPos += 15;
    }
    
    if (bookingData.payment?.razorpay_payment_id) {
      doc.text(`Payment ID: ${bookingData.payment.razorpay_payment_id}`, 50, yPos);
      yPos += 15;
    }

    // Total
    yPos += 10;
    doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
    yPos += 15;
    
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Total Amount:', 350, yPos);
    doc.text(formatCurrency(bookingData.amount, bookingData.currency), 450, yPos, { align: 'right', width: 100 });
    yPos += 20;
    
    doc.moveTo(50, yPos).lineTo(550, yPos).stroke();

    // Footer
    const pageHeight = doc.page.height;
    const footerY = pageHeight - 50;
    
    doc.fontSize(8).font('Helvetica').fillColor('gray');
    doc.text('This is a computer-generated invoice. No signature required.', 50, footerY, { align: 'center', width: 500 });
    doc.text('Thank you for your booking!', 50, footerY + 15, { align: 'center', width: 500 });

    // Finalize PDF
    doc.end();

    // Wait for PDF to be generated
    return new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      
      doc.on('error', (error) => {
        logger.error('PDF generation error:', error);
        reject(new ApiError(500, 'Failed to generate invoice PDF'));
      });
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Failed to generate booking invoice:', error);
    throw new ApiError(500, t('errors.internalServerError'));
  }
};

