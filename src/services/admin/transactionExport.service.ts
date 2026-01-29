import { TransactionModel, TransactionStatus, TransactionType, TransactionSource } from '../../models/transaction.model';
import { BookingModel } from '../../models/booking.model';
import { getUserObjectId } from '../../utils/userCache';
import { Types } from 'mongoose';
import { logger } from '../../utils/logger';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { tmpdir } from 'os';
import { join } from 'path';
import { createObjectCsvWriter } from 'csv-writer';

export interface TransactionExportFilters {
  userId?: string;
  bookingId?: string;
  status?: TransactionStatus;
  type?: TransactionType;
  source?: TransactionSource;
  search?: string;
  startDate?: string;
  endDate?: string;
}

interface ExportDataRow {
  'Transaction ID': string;
  'Booking ID': string;
  'User Name': string;
  'User Email': string;
  'Amount': number;
  'Currency': string;
  'Status': string;
  'Payment Method': string;
  'Failure Reason': string;
  'Processed At': string;
  'Created At': string;
}

/**
 * Get transactions data for export
 */
const getTransactionsForExport = async (
  filters: TransactionExportFilters = {}
): Promise<any[]> => {
  try {
    const query: any = {};

    // Filter by user if provided
    if (filters.userId) {
      const userObjectId = await getUserObjectId(filters.userId);
      if (userObjectId) {
        query.user = userObjectId;
      }
    }

    // Filter by booking if provided
    if (filters.bookingId) {
      const queryId = Types.ObjectId.isValid(filters.bookingId) 
        ? { _id: new Types.ObjectId(filters.bookingId) }
        : { id: filters.bookingId };
      
      const booking = await BookingModel.findOne(queryId).lean();
      if (booking) {
        query.booking = booking._id;
      }
    }

    // Filter by status if provided
    if (filters.status) {
      query.status = filters.status;
    }

    // Filter by type if provided
    if (filters.type) {
      query.type = filters.type;
    }

    // Filter by source if provided
    if (filters.source) {
      query.source = filters.source;
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    // Search by transaction ID, Razorpay order ID, payment ID, or refund ID
    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      query.$or = [
        { id: searchRegex },
        { razorpay_order_id: searchRegex },
        { razorpay_payment_id: searchRegex },
        { razorpay_refund_id: searchRegex },
      ];
    }

    // Get all transactions with population
    const transactions = await TransactionModel.find(query)
      .populate('user', 'firstName lastName email mobile')
      .populate({
        path: 'booking',
        select: 'id booking_id',
        match: { is_deleted: false },
      })
      .sort({ createdAt: -1 })
      .lean();

    return transactions.filter((tx: any) => tx.booking); // Filter out transactions with deleted bookings
  } catch (error) {
    logger.error('Failed to get transactions for export:', error);
    throw error;
  }
};

/**
 * Transform transaction data to export format
 */
const transformToExportData = (transactions: any[]): ExportDataRow[] => {
  return transactions.map((transaction: any) => {
    const transactionId = transaction.razorpay_payment_id || transaction.id;
    const bookingId = transaction.booking?.booking_id || transaction.booking?.id || 'N/A';
    const userName = transaction.user
      ? `${transaction.user.firstName || ''} ${transaction.user.lastName || ''}`.trim() || 'N/A'
      : 'N/A';
    const userEmail = transaction.user?.email || 'N/A';
    const processedAt = transaction.processed_at
      ? new Date(transaction.processed_at).toLocaleString('en-IN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'N/A';
    const createdAt = transaction.createdAt
      ? new Date(transaction.createdAt).toLocaleString('en-IN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'N/A';

    return {
      'Transaction ID': transactionId,
      'Booking ID': bookingId,
      'User Name': userName,
      'User Email': userEmail,
      'Amount': transaction.amount || 0,
      'Currency': transaction.currency || 'INR',
      'Status': transaction.status || 'N/A',
      'Payment Method': transaction.payment_method || 'N/A',
      'Failure Reason': transaction.failure_reason || 'N/A',
      'Processed At': processedAt,
      'Created At': createdAt,
    };
  });
};

/**
 * Export transactions to Excel
 */
export const exportToExcel = async (
  filters: TransactionExportFilters = {}
): Promise<Buffer> => {
  try {
    const transactions = await getTransactionsForExport(filters);
    const exportData = transformToExportData(transactions);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Transactions');

    // Define columns
    worksheet.columns = [
      { header: 'Transaction ID', key: 'Transaction ID', width: 30 },
      { header: 'Booking ID', key: 'Booking ID', width: 30 },
      { header: 'User Name', key: 'User Name', width: 25 },
      { header: 'User Email', key: 'User Email', width: 30 },
      { header: 'Amount', key: 'Amount', width: 15 },
      { header: 'Currency', key: 'Currency', width: 10 },
      { header: 'Status', key: 'Status', width: 15 },
      { header: 'Payment Method', key: 'Payment Method', width: 20 },
      { header: 'Failure Reason', key: 'Failure Reason', width: 30 },
      { header: 'Processed At', key: 'Processed At', width: 20 },
      { header: 'Created At', key: 'Created At', width: 20 },
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
    logger.error('Failed to export transactions to Excel:', error);
    throw error;
  }
};

/**
 * Export transactions to CSV
 */
export const exportToCSV = async (
  filters: TransactionExportFilters = {}
): Promise<string> => {
  try {
    const transactions = await getTransactionsForExport(filters);
    const exportData = transformToExportData(transactions);

    const tempFilePath = join(tmpdir(), `transactions-${Date.now()}.csv`);

    const csvWriter = createObjectCsvWriter({
      path: tempFilePath,
      header: [
        { id: 'Transaction ID', title: 'Transaction ID' },
        { id: 'Booking ID', title: 'Booking ID' },
        { id: 'User Name', title: 'User Name' },
        { id: 'User Email', title: 'User Email' },
        { id: 'Amount', title: 'Amount' },
        { id: 'Currency', title: 'Currency' },
        { id: 'Status', title: 'Status' },
        { id: 'Payment Method', title: 'Payment Method' },
        { id: 'Failure Reason', title: 'Failure Reason' },
        { id: 'Processed At', title: 'Processed At' },
        { id: 'Created At', title: 'Created At' },
      ],
    });

    await csvWriter.writeRecords(exportData);

    // Read file and return as string
    const fs = await import('fs/promises');
    const csvContent = await fs.readFile(tempFilePath, 'utf-8');
    
    // Clean up temp file
    await fs.unlink(tempFilePath).catch(() => {});

    return csvContent;
  } catch (error) {
    logger.error('Failed to export transactions to CSV:', error);
    throw error;
  }
};

/**
 * Export transactions to PDF
 */
export const exportToPDF = async (
  filters: TransactionExportFilters = {}
): Promise<Buffer> => {
  try {
    const transactions = await getTransactionsForExport(filters);
    const exportData = transformToExportData(transactions);

    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4',
      layout: 'landscape'
    });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {});
    doc.on('error', (error) => {
      logger.error('PDF generation error:', error);
    });

    // Title
    doc.fontSize(18).font('Helvetica-Bold').text('Transactions Report', { align: 'center' });
    doc.moveDown(0.5);

    // Date range info
    if (filters.startDate || filters.endDate) {
      doc.fontSize(10).font('Helvetica').text(
        `Date Range: ${filters.startDate || 'N/A'} to ${filters.endDate || 'N/A'}`,
        { align: 'center' }
      );
      doc.moveDown(0.5);
    }

    doc.fontSize(10).text(`Total Records: ${exportData.length}`, { align: 'center' });
    doc.moveDown(1);

    // Table configuration
    const pageWidth = doc.page.width - 100;
    const pageHeight = doc.page.height - 100;
    const startX = 50;
    const startY = doc.y;
    const rowHeight = 20;
    const headerHeight = 25;

    // Column widths (11 columns)
    const colWidths = [
      pageWidth * 0.15, // Transaction ID
      pageWidth * 0.12, // Booking ID
      pageWidth * 0.12, // User Name
      pageWidth * 0.12, // User Email
      pageWidth * 0.08, // Amount
      pageWidth * 0.06, // Currency
      pageWidth * 0.08, // Status
      pageWidth * 0.10, // Payment Method
      pageWidth * 0.10, // Failure Reason
      pageWidth * 0.09, // Processed At
      pageWidth * 0.08, // Created At
    ];

    // Table headers
    const headers = [
      'Transaction ID',
      'Booking ID',
      'User Name',
      'User Email',
      'Amount',
      'Currency',
      'Status',
      'Payment Method',
      'Failure Reason',
      'Processed At',
      'Created At',
    ];

    let currentY = startY;
    let currentPage = 1;

    // Function to draw header row
    const drawHeader = (y: number) => {
      let x = startX;
      headers.forEach((header, index) => {
        doc.rect(x, y, colWidths[index], headerHeight).stroke();
        doc.fontSize(8).font('Helvetica-Bold').text(header, x + 5, y + 5, {
          width: colWidths[index] - 10,
          height: headerHeight - 10,
          align: 'left',
        });
        x += colWidths[index];
      });
    };

    // Function to draw data row
    const drawRow = (row: ExportDataRow, y: number) => {
      let x = startX;
      const values = [
        row['Transaction ID'],
        row['Booking ID'],
        row['User Name'],
        row['User Email'],
        row['Amount'].toString(),
        row['Currency'],
        row['Status'],
        row['Payment Method'],
        row['Failure Reason'],
        row['Processed At'],
        row['Created At'],
      ];

      values.forEach((value, index) => {
        doc.rect(x, y, colWidths[index], rowHeight).stroke();
        doc.fontSize(7).font('Helvetica').text(value || 'N/A', x + 5, y + 5, {
          width: colWidths[index] - 10,
          height: rowHeight - 10,
          align: 'left',
        });
        x += colWidths[index];
      });
    };

    // Draw header
    drawHeader(currentY);
    currentY += headerHeight;

    // Draw data rows
    exportData.forEach((row) => {
      // Check if we need a new page
      if (currentY + rowHeight > pageHeight) {
        doc.addPage();
        currentY = 50;
        drawHeader(currentY);
        currentY += headerHeight;
        currentPage++;
      }

      drawRow(row, currentY);
      currentY += rowHeight;
    });

    doc.end();

    // Wait for PDF to finish generating
    return new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', reject);
    });
  } catch (error) {
    logger.error('Failed to export transactions to PDF:', error);
    throw error;
  }
};
