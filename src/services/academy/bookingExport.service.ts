import { Types } from 'mongoose';
import { BookingModel, BookingStatus, PaymentStatus } from '../../models/booking.model';
import { CoachingCenterModel } from '../../models/coachingCenter.model';
import { getUserObjectId } from '../../utils/userCache';
import { logger } from '../../utils/logger';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { tmpdir } from 'os';
import { join } from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { promises as fs } from 'fs';

export interface AcademyBookingExportFilters {
  centerId?: string;
  batchId?: string;
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  startDate?: string; // YYYY-MM-DD format
  endDate?: string; // YYYY-MM-DD format
  type?: 'all' | 'confirmed' | 'pending' | 'cancelled' | 'rejected'; // Export type filter
}

interface ExportDataRow {
  'Booking ID': string;
  'User Name': string;
  'Student Names': string;
  'Student Count': number;
  'Batch Name': string;
  'Center Name': string;
  'Amount': number;
  'Status': string;
  'Payment Status': string;
  'Rejection Reason': string;
  'Cancellation Reason': string;
  'Created Date': string;
}

/**
 * Get bookings data for export
 */
const getBookingsForExport = async (
  userId: string,
  filters: AcademyBookingExportFilters = {}
): Promise<any[]> => {
  try {
    const userObjectId = await getUserObjectId(userId);
    if (!userObjectId) {
      throw new Error('User not found');
    }

    // Get all coaching centers owned by the user
    const coachingCenters = await CoachingCenterModel.find({
      user: userObjectId,
      is_deleted: false,
    }).select('_id').lean();

    if (coachingCenters.length === 0) {
      return [];
    }

    const centerIds = coachingCenters.map(center => center._id as Types.ObjectId);

    // Build query
    const query: any = {
      center: { $in: centerIds },
      is_deleted: false,
    };

    // Filter by center if provided
    if (filters.centerId) {
      if (!Types.ObjectId.isValid(filters.centerId)) {
        throw new Error('Invalid center ID');
      }
      const centerObjectId = new Types.ObjectId(filters.centerId);
      if (!centerIds.some(id => id.toString() === centerObjectId.toString())) {
        throw new Error('Center does not belong to you');
      }
      query.center = centerObjectId;
    }

    // Filter by batch if provided
    if (filters.batchId) {
      if (!Types.ObjectId.isValid(filters.batchId)) {
        throw new Error('Invalid batch ID');
      }
      query.batch = new Types.ObjectId(filters.batchId);
    }

    // Filter by status if provided
    if (filters.status) {
      query.status = filters.status;
    }

    // Filter by payment status if provided
    if (filters.paymentStatus) {
      query['payment.status'] = filters.paymentStatus;
    }

    // Filter by type (predefined status combinations)
    if (filters.type) {
      switch (filters.type) {
        case 'confirmed':
          query.status = BookingStatus.CONFIRMED;
          query['payment.status'] = PaymentStatus.SUCCESS;
          break;
        case 'pending':
          query.status = { $in: [BookingStatus.SLOT_BOOKED, BookingStatus.APPROVED, BookingStatus.REQUESTED, BookingStatus.PAYMENT_PENDING] };
          break;
        case 'cancelled':
          query.status = BookingStatus.CANCELLED;
          break;
        case 'rejected':
          query.status = BookingStatus.REJECTED;
          break;
        case 'all':
        default:
          // No additional filter
          break;
      }
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        startDate.setHours(0, 0, 0, 0);
        query.createdAt.$gte = startDate;
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    // Get all bookings (no pagination for export)
    const bookings = await BookingModel.find(query)
      .populate('user', 'firstName lastName')
      .populate('participants', 'firstName lastName')
      .populate('batch', 'name')
      .populate('center', 'center_name')
      .select('booking_id id status amount priceBreakdown payment rejection_reason cancellation_reason user participants batch center createdAt')
      .sort({ createdAt: -1 })
      .lean();

    return bookings;
  } catch (error) {
    logger.error('Failed to get bookings for export:', error);
    throw error;
  }
};

/**
 * Transform bookings to export data format
 */
const transformToExportData = (bookings: any[]): ExportDataRow[] => {
  return bookings.map((booking: any) => {
    // Format participant names
    let studentNames = 'N/A';
    const studentCount = booking.participants && Array.isArray(booking.participants) ? booking.participants.length : 0;
    if (booking.participants && Array.isArray(booking.participants) && booking.participants.length > 0) {
      const participantNames = booking.participants
        .map((p: any) => {
          const firstName = p?.firstName || '';
          const lastName = p?.lastName || '';
          return `${firstName} ${lastName}`.trim();
        })
        .filter((name: string) => name.length > 0);
      studentNames = participantNames.join(', ') || 'N/A';
    }

    // Format user name
    const userName = booking.user
      ? `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim() || 'N/A'
      : 'N/A';

    // Get batch amount
    const batchAmount = booking.priceBreakdown?.batch_amount || booking.amount || 0;

    // Format dates
    const createdDate = booking.createdAt
      ? new Date(booking.createdAt).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
      : 'N/A';

    // Format payment status
    const paymentStatus = booking.payment?.status === PaymentStatus.SUCCESS
      ? 'paid'
      : (booking.payment?.status || 'pending');

    return {
      'Booking ID': booking.booking_id || booking.id || 'N/A',
      'User Name': userName,
      'Student Names': studentNames,
      'Student Count': studentCount,
      'Batch Name': booking.batch?.name || 'N/A',
      'Center Name': booking.center?.center_name || 'N/A',
      'Amount': batchAmount,
      'Status': booking.status || 'N/A',
      'Payment Status': paymentStatus,
      'Rejection Reason': booking.rejection_reason || '',
      'Cancellation Reason': booking.cancellation_reason || '',
      'Created Date': createdDate,
    };
  });
};

/**
 * Export bookings to Excel
 */
export const exportToExcel = async (
  userId: string,
  filters: AcademyBookingExportFilters = {}
): Promise<Buffer> => {
  try {
    const bookings = await getBookingsForExport(userId, filters);
    const exportData = transformToExportData(bookings);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Bookings');

    // Define columns
    worksheet.columns = [
      { header: 'Booking ID', key: 'Booking ID', width: 30 },
      { header: 'User Name', key: 'User Name', width: 25 },
      { header: 'Student Names', key: 'Student Names', width: 40 },
      { header: 'Student Count', key: 'Student Count', width: 15 },
      { header: 'Batch Name', key: 'Batch Name', width: 30 },
      { header: 'Center Name', key: 'Center Name', width: 30 },
      { header: 'Amount', key: 'Amount', width: 15 },
      { header: 'Status', key: 'Status', width: 20 },
      { header: 'Payment Status', key: 'Payment Status', width: 18 },
      { header: 'Rejection Reason', key: 'Rejection Reason', width: 40 },
      { header: 'Cancellation Reason', key: 'Cancellation Reason', width: 40 },
      { header: 'Created Date', key: 'Created Date', width: 20 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data rows
    exportData.forEach((row) => {
      worksheet.addRow(row);
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  } catch (error) {
    logger.error('Failed to export bookings to Excel:', error);
    throw error;
  }
};

/**
 * Export bookings to CSV
 */
export const exportToCSV = async (
  userId: string,
  filters: AcademyBookingExportFilters = {}
): Promise<string> => {
  try {
    const bookings = await getBookingsForExport(userId, filters);
    const exportData = transformToExportData(bookings);

    const tempFilePath = join(tmpdir(), `academy-bookings-${Date.now()}.csv`);

    const csvWriter = createObjectCsvWriter({
      path: tempFilePath,
      header: [
        { id: 'Booking ID', title: 'Booking ID' },
        { id: 'User Name', title: 'User Name' },
        { id: 'Student Names', title: 'Student Names' },
        { id: 'Student Count', title: 'Student Count' },
        { id: 'Batch Name', title: 'Batch Name' },
        { id: 'Center Name', title: 'Center Name' },
        { id: 'Amount', title: 'Amount' },
        { id: 'Status', title: 'Status' },
        { id: 'Payment Status', title: 'Payment Status' },
        { id: 'Rejection Reason', title: 'Rejection Reason' },
        { id: 'Cancellation Reason', title: 'Cancellation Reason' },
        { id: 'Created Date', title: 'Created Date' },
      ],
    });

    await csvWriter.writeRecords(exportData);

    // Read file and return as string
    const csvContent = await fs.readFile(tempFilePath, 'utf-8');
    
    // Clean up temp file
    await fs.unlink(tempFilePath).catch(() => {});

    return csvContent;
  } catch (error) {
    logger.error('Failed to export bookings to CSV:', error);
    throw error;
  }
};

/**
 * Export bookings to PDF
 */
export const exportToPDF = async (
  userId: string,
  filters: AcademyBookingExportFilters = {}
): Promise<Buffer> => {
  try {
    const bookings = await getBookingsForExport(userId, filters);
    const exportData = transformToExportData(bookings);

    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {});

    // Add title
    doc.fontSize(18).text('Academy Bookings Report', { align: 'center' });
    doc.moveDown();

    // Add filter info if any
    if (filters.startDate || filters.endDate || filters.type) {
      doc.fontSize(10).text('Filters:', { underline: true });
      if (filters.startDate) {
        doc.text(`Start Date: ${filters.startDate}`);
      }
      if (filters.endDate) {
        doc.text(`End Date: ${filters.endDate}`);
      }
      if (filters.type) {
        doc.text(`Type: ${filters.type}`);
      }
      doc.moveDown();
    }

    // Add table headers
    const tableTop = doc.y;
    const tableLeft = 50;
    const colWidths = [80, 80, 100, 40, 80, 80, 50, 60, 50, 80, 80, 60];
    const headers = [
      'Booking ID',
      'User',
      'Students',
      'Count',
      'Batch',
      'Center',
      'Amount',
      'Status',
      'Payment',
      'Reject Reason',
      'Cancel Reason',
      'Date',
    ];

    doc.fontSize(8);
    let x = tableLeft;
    headers.forEach((header, i) => {
      doc.text(header, x, tableTop, { width: colWidths[i], align: 'left' });
      x += colWidths[i];
    });

    // Add data rows
    let y = tableTop + 20;
    exportData.forEach((row) => {
      if (y > 750) {
        // New page
        doc.addPage();
        y = 50;
      }

      x = tableLeft;
      const rowData = [
        row['Booking ID'].substring(0, 15) || '',
        row['User Name'].substring(0, 15) || '',
        row['Student Names'].substring(0, 20) || '',
        row['Student Count'].toString(),
        row['Batch Name'].substring(0, 15) || '',
        row['Center Name'].substring(0, 15) || '',
        row['Amount'].toString(),
        row['Status'].substring(0, 12) || '',
        row['Payment Status'].substring(0, 10) || '',
        row['Rejection Reason'].substring(0, 20) || '',
        row['Cancellation Reason'].substring(0, 20) || '',
        row['Created Date'],
      ];

      rowData.forEach((cell, i) => {
        doc.text(cell || '', x, y, { width: colWidths[i], align: 'left' });
        x += colWidths[i];
      });

      y += 15;
    });

    doc.end();

    // Wait for PDF to be generated
    return new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', reject);
    });
  } catch (error) {
    logger.error('Failed to export bookings to PDF:', error);
    throw error;
  }
};
