import { Types } from 'mongoose';
import { BookingModel, BookingStatus } from '../../models/booking.model';
import { PaymentStatus } from '../../models/booking.model';
import { CoachingCenterModel } from '../../models/coachingCenter.model';
import { getUserObjectId } from '../../utils/userCache';
import { logger } from '../../utils/logger';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { tmpdir } from 'os';
import { join } from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { calculateAge } from '../client/booking.service';

export interface ExportFilters {
  centerId?: string;
  batchId?: string;
  status?: 'active' | 'left' | 'completed' | 'pending';
  startDate?: string;
  endDate?: string;
}

interface ExportDataRow {
  'Student ID': string;
  'Student Name': string;
  'Gender': string;
  'Date of Birth': string;
  'Age': string;
  'School Name': string;
  'Contact Number': string;
  'User ID': string;
  'User Name': string;
  'User Email': string;
  'User Mobile': string;
  'Batch ID': string;
  'Batch Name': string;
  'Sport': string;
  'Center': string;
  'Booking Status': string;
  'Payment Status': string;
  'Enrolled Date': string;
  'Amount': string;
  'Overall Status': string;
  'Total Enrollments': number;
  'Active Enrollments': number;
}

/**
 * Calculate age from date of birth (helper wrapper)
 */
const calculateAgeFromDob = (dob: Date | string | null | undefined): number | null => {
  if (!dob) return null;
  const birthDate = typeof dob === 'string' ? new Date(dob) : dob;
  if (isNaN(birthDate.getTime())) return null;
  
  const today = new Date();
  return calculateAge(birthDate, today);
};

/**
 * Get enrolled students data for export
 */
const getStudentsForExport = async (
  academyUserId: string,
  filters: ExportFilters = {}
): Promise<any[]> => {
  try {
    const userObjectId = await getUserObjectId(academyUserId);
    if (!userObjectId) {
      throw new Error('Academy user not found');
    }

    // Get all coaching centers owned by the user
    const coachingCenters = await CoachingCenterModel.find({
      user: userObjectId,
      is_deleted: false,
    }).select('_id center_name').lean();

    if (coachingCenters.length === 0) {
      return [];
    }

    const centerIds = coachingCenters.map(center => center._id);

    // Build query for bookings
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

    // Get all bookings matching the query
    const bookings = await BookingModel.find(query)
      .populate('user', 'id firstName lastName email mobile')
      .populate('participants', 'id firstName lastName gender dob schoolName contactNumber profilePhoto')
      .populate('batch', 'id name sport center scheduled')
      .populate('center', 'id center_name')
      .populate('sport', 'id name')
      .sort({ createdAt: -1 })
      .lean();

    // Group by participant (avoid duplicates)
    const participantMap = new Map<string, {
      participant: any;
      user: any;
      batches: any[];
      overallStatus: string;
      totalEnrollments: number;
      activeEnrollments: number;
    }>();

    for (const booking of bookings) {
      const bookingData = booking as any;
      
      // Process each participant in the booking
      const participants = Array.isArray(bookingData.participants) 
        ? bookingData.participants 
        : [bookingData.participants];

      for (const participant of participants) {
        if (!participant) continue;
        
        const participantId = (participant.id || participant._id?.toString() || '').toString();
        if (!participantId) continue;
        
        // Get or create participant entry
        if (!participantMap.has(participantId)) {
          const dob = participant.dob ? (typeof participant.dob === 'string' ? new Date(participant.dob) : participant.dob) : null;
          participantMap.set(participantId, {
            participant: {
              id: participant.id || participant._id?.toString() || '',
              firstName: participant.firstName || null,
              lastName: participant.lastName || null,
              gender: participant.gender ?? null,
              dob: dob,
              age: calculateAgeFromDob(dob),
              schoolName: participant.schoolName || null,
              contactNumber: participant.contactNumber || null,
              profilePhoto: participant.profilePhoto || null,
            },
            user: {
              id: bookingData.user?.id || bookingData.user?._id?.toString() || '',
              firstName: bookingData.user?.firstName || '',
              lastName: bookingData.user?.lastName || null,
              email: bookingData.user?.email || '',
              mobile: bookingData.user?.mobile || null,
            },
            batches: [],
            overallStatus: 'pending',
            totalEnrollments: 0,
            activeEnrollments: 0,
          });
        }

        const student = participantMap.get(participantId)!;
        
        // Add batch information
        const batchInfo = {
          batchId: bookingData.batch?.id || bookingData.batch?._id?.toString() || '',
          batchName: bookingData.batch?.name || '',
          sport: {
            id: bookingData.sport?.id || bookingData.sport?._id?.toString() || '',
            name: bookingData.sport?.name || '',
          },
          center: {
            id: bookingData.center?.id || bookingData.center?._id?.toString() || '',
            name: bookingData.center?.center_name || '',
          },
          bookingId: bookingData.id || bookingData._id?.toString() || '',
          bookingStatus: bookingData.status as BookingStatus,
          paymentStatus: bookingData.payment?.status as PaymentStatus,
          enrolledDate: bookingData.createdAt || new Date(),
          amount: bookingData.amount || 0,
        };

        // Check if this batch is already added (avoid duplicates)
        const batchExists = student.batches.some(b => b.batchId === batchInfo.batchId && b.bookingId === batchInfo.bookingId);
        if (!batchExists) {
          student.batches.push(batchInfo);
          student.totalEnrollments++;
          if (batchInfo.bookingStatus === BookingStatus.CONFIRMED) {
            student.activeEnrollments++;
          }
        }
      }
    }

    // Convert map to array and calculate overall status
    let students = Array.from(participantMap.values()).map(student => {
      // Determine overall status based on batch statuses
      const hasActive = student.batches.some(b => b.bookingStatus === BookingStatus.CONFIRMED);
      const hasCompleted = student.batches.some(b => b.bookingStatus === BookingStatus.COMPLETED);
      const hasCancelled = student.batches.some(b => b.bookingStatus === BookingStatus.CANCELLED);

      if (hasActive) {
        student.overallStatus = 'active';
      } else if (hasCompleted) {
        student.overallStatus = 'completed';
      } else if (hasCancelled) {
        student.overallStatus = 'left';
      } else {
        student.overallStatus = 'pending';
      }

      return student;
    });

    // Filter by status if provided
    if (filters.status) {
      students = students.filter(s => s.overallStatus === filters.status);
    }

    // Flatten to one row per batch enrollment
    const exportRows: any[] = [];
    for (const student of students) {
      if (student.batches.length === 0) {
        // If no batches, still include the student with empty batch info
        exportRows.push({
          ...student,
          batchId: '',
          batchName: '',
          sport: '',
          center: '',
          bookingStatus: '',
          paymentStatus: '',
          enrolledDate: null,
          amount: 0,
        });
      } else {
        // One row per batch
        for (const batch of student.batches) {
          exportRows.push({
            ...student,
            batchId: batch.batchId,
            batchName: batch.batchName,
            sport: batch.sport.name,
            center: batch.center.name,
            bookingStatus: batch.bookingStatus,
            paymentStatus: batch.paymentStatus,
            enrolledDate: batch.enrolledDate,
            amount: batch.amount,
          });
        }
      }
    }

    return exportRows;
  } catch (error) {
    logger.error('Failed to get students for export:', error);
    throw error;
  }
};

/**
 * Transform student data to export format
 */
const transformToExportData = (students: any[]): ExportDataRow[] => {
    return students.map((student) => {
      const genderMap: { [key: number]: string } = {
        0: 'Male',
        1: 'Female',
        2: 'Other',
      };

      // Combine first and last names
      const studentFirstName = student.participant?.firstName || '';
      const studentLastName = student.participant?.lastName || '';
      const studentName = `${studentFirstName} ${studentLastName}`.trim() || '';

      const userFirstName = student.user?.firstName || '';
      const userLastName = student.user?.lastName || '';
      const userName = `${userFirstName} ${userLastName}`.trim() || '';

      return {
        'Student ID': student.participant?.id || '',
        'Student Name': studentName,
      'Gender': student.participant?.gender !== null && student.participant?.gender !== undefined
        ? genderMap[student.participant.gender] || 'N/A'
        : 'N/A',
      'Date of Birth': student.participant?.dob
        ? new Date(student.participant.dob).toLocaleDateString()
        : '',
      'Age': student.participant?.age !== null && student.participant?.age !== undefined
        ? student.participant.age.toString()
        : '',
      'School Name': student.participant?.schoolName || '',
      'Contact Number': student.participant?.contactNumber || '',
      'User ID': student.user?.id || '',
      'User Name': userName,
      'User Email': student.user?.email || '',
      'User Mobile': student.user?.mobile || '',
      'Batch ID': student.batchId || '',
      'Batch Name': student.batchName || '',
      'Sport': student.sport || '',
      'Center': student.center || '',
      'Booking Status': student.bookingStatus || '',
      'Payment Status': student.paymentStatus || '',
      'Enrolled Date': student.enrolledDate
        ? new Date(student.enrolledDate).toLocaleString()
        : '',
      'Amount': student.amount ? student.amount.toString() : '0',
      'Overall Status': student.overallStatus || '',
      'Total Enrollments': student.totalEnrollments || 0,
      'Active Enrollments': student.activeEnrollments || 0,
    };
  });
};

/**
 * Export students to Excel
 */
export const exportToExcel = async (
  academyUserId: string,
  filters: ExportFilters = {}
): Promise<Buffer> => {
  try {
    const students = await getStudentsForExport(academyUserId, filters);
    const exportData = transformToExportData(students);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Enrolled Students');

    // Define columns
    worksheet.columns = [
      { header: 'Student ID', key: 'Student ID', width: 30 },
      { header: 'Student Name', key: 'Student Name', width: 25 },
      { header: 'Gender', key: 'Gender', width: 10 },
      { header: 'Date of Birth', key: 'Date of Birth', width: 15 },
      { header: 'Age', key: 'Age', width: 8 },
      { header: 'School Name', key: 'School Name', width: 25 },
      { header: 'Contact Number', key: 'Contact Number', width: 15 },
      { header: 'User ID', key: 'User ID', width: 30 },
      { header: 'User Name', key: 'User Name', width: 25 },
      { header: 'User Email', key: 'User Email', width: 30 },
      { header: 'User Mobile', key: 'User Mobile', width: 15 },
      { header: 'Batch ID', key: 'Batch ID', width: 30 },
      { header: 'Batch Name', key: 'Batch Name', width: 25 },
      { header: 'Sport', key: 'Sport', width: 20 },
      { header: 'Center', key: 'Center', width: 25 },
      { header: 'Booking Status', key: 'Booking Status', width: 15 },
      { header: 'Payment Status', key: 'Payment Status', width: 15 },
      { header: 'Enrolled Date', key: 'Enrolled Date', width: 20 },
      { header: 'Amount', key: 'Amount', width: 12 },
      { header: 'Overall Status', key: 'Overall Status', width: 15 },
      { header: 'Total Enrollments', key: 'Total Enrollments', width: 15 },
      { header: 'Active Enrollments', key: 'Active Enrollments', width: 15 },
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
    logger.error('Failed to export to Excel:', error);
    throw error;
  }
};

/**
 * Helper function to draw table cell with border
 */
const drawTableCell = (
  doc: InstanceType<typeof PDFDocument>,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  options: { align?: 'left' | 'center' | 'right'; fontSize?: number; bold?: boolean } = {}
) => {
  const { align = 'left', fontSize = 7, bold = false } = options;
  
  const maxTextWidth = width - 8;
  let displayText = text || '';
  
  if (bold) {
    doc.font('Helvetica-Bold').fontSize(fontSize);
  } else {
    doc.font('Helvetica').fontSize(fontSize);
  }
  
  const textWidth = doc.widthOfString(displayText);
  if (textWidth > maxTextWidth) {
    let truncated = displayText;
    while (doc.widthOfString(truncated + '...') > maxTextWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }
    displayText = truncated + (truncated.length < displayText.length ? '...' : '');
  }
  
  doc.rect(x, y, width, height).stroke();
  
  const padding = 4;
  let textX = x + padding;
  const textY = y + (height - fontSize) / 2 - 2;
  
  if (align === 'center') {
    const measuredWidth = doc.widthOfString(displayText);
    textX = x + (width - measuredWidth) / 2;
  } else if (align === 'right') {
    const measuredWidth = doc.widthOfString(displayText);
    textX = x + width - measuredWidth - padding;
  }
  
  doc.text(displayText, textX, textY, {
    width: width - (padding * 2),
    height: height - (padding * 2),
    align: align,
  });
};

/**
 * Export students to PDF
 */
export const exportToPDF = async (
  academyUserId: string,
  filters: ExportFilters = {}
): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    try {
      const students = await getStudentsForExport(academyUserId, filters);
      const exportData = transformToExportData(students);

      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4',
        layout: 'landscape'
      });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title
      doc.fontSize(18).font('Helvetica-Bold').text('Enrolled Students Report', { align: 'center' });
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
      const rowHeight = 18;
      const headerHeight = 22;

      // Column widths (reduced columns for PDF)
      const colWidths = [
        pageWidth * 0.12, // Student Name
        pageWidth * 0.08, // Age
        pageWidth * 0.12, // User Name
        pageWidth * 0.12, // User Email
        pageWidth * 0.12, // Batch Name
        pageWidth * 0.10, // Sport
        pageWidth * 0.12, // Center
        pageWidth * 0.10, // Booking Status
        pageWidth * 0.10, // Payment Status
        pageWidth * 0.04, // Amount
      ];

      // Table headers
      const headers = [
        'Student Name',
        'Age',
        'User Name',
        'User Email',
        'Batch Name',
        'Sport',
        'Center',
        'Booking Status',
        'Payment Status',
        'Amount',
      ];

      let currentY = startY;
      let currentPage = 1;

      // Function to draw header row
      const drawHeader = (y: number) => {
        let x = startX;
        headers.forEach((header, i) => {
          drawTableCell(doc, header, x, y, colWidths[i], headerHeight, {
            align: 'center',
            fontSize: 8,
            bold: true,
          });
          x += colWidths[i];
        });
      };

      // Function to draw data row
      const drawDataRow = (row: ExportDataRow, y: number) => {
        let x = startX;
        const rowData = [
          row['Student Name'] || '',
          row['Age'] || '',
          row['User Name'] || '',
          row['User Email'] || '',
          row['Batch Name'] || '',
          row['Sport'] || '',
          row['Center'] || '',
          row['Booking Status'] || '',
          row['Payment Status'] || '',
          row['Amount'] || '0',
        ];

        rowData.forEach((cell, i) => {
          drawTableCell(doc, cell, x, y, colWidths[i], rowHeight, {
            align: 'left',
            fontSize: 6,
            bold: false,
          });
          x += colWidths[i];
        });
      };

      // Draw header on first page
      drawHeader(currentY);
      currentY += headerHeight;

      // Draw data rows
      exportData.forEach((row) => {
        if (currentY + rowHeight > pageHeight - 50) {
          doc.addPage();
          currentPage++;
          currentY = 50;
          drawHeader(currentY);
          currentY += headerHeight;
        }

        drawDataRow(row, currentY);
        currentY += rowHeight;
      });

      // Add footer with page number
      const totalPages = currentPage;
      for (let i = 0; i < totalPages; i++) {
        try {
          doc.switchToPage(i);
          doc.fontSize(8).font('Helvetica').text(
            `Page ${i + 1} of ${totalPages}`,
            doc.page.width / 2 - 50,
            doc.page.height - 40,
            { align: 'center' }
          );
        } catch (error) {
          // If switchToPage fails, skip page number for that page
          // This can happen if the document structure isn't fully ready
          logger.warn(`Failed to add page number to page ${i + 1}:`, error);
        }
      }

      doc.end();
    } catch (error) {
      logger.error('Failed to export to PDF:', error);
      reject(error);
    }
  });
};

/**
 * Export students to CSV
 */
export const exportToCSV = async (
  academyUserId: string,
  filters: ExportFilters = {}
): Promise<string> => {
  try {
    const students = await getStudentsForExport(academyUserId, filters);
    const exportData = transformToExportData(students);

    const tempFilePath = join(tmpdir(), `enrolled-students-${Date.now()}.csv`);

    const csvWriter = createObjectCsvWriter({
      path: tempFilePath,
      header: [
        { id: 'Student ID', title: 'Student ID' },
        { id: 'Student Name', title: 'Student Name' },
        { id: 'Gender', title: 'Gender' },
        { id: 'Date of Birth', title: 'Date of Birth' },
        { id: 'Age', title: 'Age' },
        { id: 'School Name', title: 'School Name' },
        { id: 'Contact Number', title: 'Contact Number' },
        { id: 'User ID', title: 'User ID' },
        { id: 'User Name', title: 'User Name' },
        { id: 'User Email', title: 'User Email' },
        { id: 'User Mobile', title: 'User Mobile' },
        { id: 'Batch ID', title: 'Batch ID' },
        { id: 'Batch Name', title: 'Batch Name' },
        { id: 'Sport', title: 'Sport' },
        { id: 'Center', title: 'Center' },
        { id: 'Booking Status', title: 'Booking Status' },
        { id: 'Payment Status', title: 'Payment Status' },
        { id: 'Enrolled Date', title: 'Enrolled Date' },
        { id: 'Amount', title: 'Amount' },
        { id: 'Overall Status', title: 'Overall Status' },
        { id: 'Total Enrollments', title: 'Total Enrollments' },
        { id: 'Active Enrollments', title: 'Active Enrollments' },
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
    logger.error('Failed to export to CSV:', error);
    throw error;
  }
};
