import { SportModel } from '../../models/sport.model';
import { logger } from '../../utils/logger';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { tmpdir } from 'os';
import { join } from 'path';
import { createObjectCsvWriter } from 'csv-writer';

export interface SportExportFilters {
  search?: string;
  isActive?: boolean;
  isPopular?: boolean;
  startDate?: string;
  endDate?: string;
}

interface SportExportDataRow {
  'Sport ID': string;
  'Sport Name': string;
  'Slug': string;
  'Logo URL': string;
  'Is Active': string;
  'Is Popular': string;
  'Created Date': string;
  'Updated Date': string;
}

/**
 * Get sports data for export
 */
const getSportsForExport = async (
  filters: SportExportFilters = {}
): Promise<any[]> => {
  try {
    const query: any = {};

    // Apply filters
    if (filters.search) {
      query.name = { $regex: filters.search, $options: 'i' };
    }

    if (filters.isActive !== undefined) {
      query.is_active = filters.isActive;
    }

    if (filters.isPopular !== undefined) {
      query.is_popular = filters.isPopular;
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999); // Include entire end date
        query.createdAt.$lte = endDate;
      }
    }

    const sports = await SportModel.find(query)
      .sort({ name: 1 })
      .lean();

    return sports;
  } catch (error) {
    logger.error('Failed to get sports for export:', error);
    throw error;
  }
};

/**
 * Transform sport data to export format
 */
const transformToExportData = (sports: any[]): SportExportDataRow[] => {
  return sports.map((sport) => ({
    'Sport ID': sport.custom_id || sport._id?.toString() || '',
    'Sport Name': sport.name || '',
    'Slug': sport.slug || '',
    'Logo URL': sport.logo || '',
    'Is Active': sport.is_active ? 'Yes' : 'No',
    'Is Popular': sport.is_popular ? 'Yes' : 'No',
    'Created Date': sport.createdAt ? new Date(sport.createdAt).toLocaleString() : '',
    'Updated Date': sport.updatedAt ? new Date(sport.updatedAt).toLocaleString() : '',
  }));
};

/**
 * Export sports to Excel
 */
export const exportToExcel = async (
  filters: SportExportFilters = {}
): Promise<Buffer> => {
  try {
    const sports = await getSportsForExport(filters);
    const exportData = transformToExportData(sports);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sports');

    // Define columns
    worksheet.columns = [
      { header: 'Sport ID', key: 'Sport ID', width: 30 },
      { header: 'Sport Name', key: 'Sport Name', width: 30 },
      { header: 'Slug', key: 'Slug', width: 30 },
      { header: 'Logo URL', key: 'Logo URL', width: 50 },
      { header: 'Is Active', key: 'Is Active', width: 12 },
      { header: 'Is Popular', key: 'Is Popular', width: 12 },
      { header: 'Created Date', key: 'Created Date', width: 20 },
      { header: 'Updated Date', key: 'Updated Date', width: 20 },
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
    logger.error('Failed to export sports to Excel:', error);
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
  const { align = 'left', fontSize = 8, bold = false } = options;
  
  // Truncate text if too long to fit in cell
  const maxTextWidth = width - 8;
  let displayText = text || '';
  
  // Set font to measure text
  if (bold) {
    doc.font('Helvetica-Bold').fontSize(fontSize);
  } else {
    doc.font('Helvetica').fontSize(fontSize);
  }
  
  // Truncate text if it's too wide
  const textWidth = doc.widthOfString(displayText);
  if (textWidth > maxTextWidth) {
    // Try to truncate intelligently
    let truncated = displayText;
    while (doc.widthOfString(truncated + '...') > maxTextWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }
    displayText = truncated + (truncated.length < displayText.length ? '...' : '');
  }
  
  // Draw border
  doc.rect(x, y, width, height).stroke();
  
  // Calculate text position based on alignment
  const padding = 4;
  let textX = x + padding;
  const textY = y + (height - fontSize) / 2 - 2; // Vertically center text
  
  if (align === 'center') {
    const measuredWidth = doc.widthOfString(displayText);
    textX = x + (width - measuredWidth) / 2;
  } else if (align === 'right') {
    const measuredWidth = doc.widthOfString(displayText);
    textX = x + width - measuredWidth - padding;
  }
  
  // Draw text
  doc.text(displayText, textX, textY, {
    width: width - (padding * 2),
    height: height - (padding * 2),
    align: align,
  });
};

/**
 * Export sports to PDF
 */
export const exportToPDF = async (
  filters: SportExportFilters = {}
): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    try {
      const sports = await getSportsForExport(filters);
      const exportData = transformToExportData(sports);

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
      doc.fontSize(18).font('Helvetica-Bold').text('Sports Report', { align: 'center' });
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

      // Column widths (proportional to page width)
      const colWidths = [
        pageWidth * 0.20, // Sport ID
        pageWidth * 0.25, // Sport Name
        pageWidth * 0.15, // Slug
        pageWidth * 0.12, // Is Active
        pageWidth * 0.12, // Is Popular
        pageWidth * 0.16, // Created Date
      ];

      // Table headers
      const headers = [
        'Sport ID',
        'Sport Name',
        'Slug',
        'Is Active',
        'Is Popular',
        'Created Date',
      ];

      let currentY = startY;
      let currentPage = 1;

      // Function to draw header row
      const drawHeader = (y: number) => {
        let x = startX;
        headers.forEach((header, i) => {
          drawTableCell(doc, header, x, y, colWidths[i], headerHeight, {
            align: 'center',
            fontSize: 9,
            bold: true,
          });
          x += colWidths[i];
        });
      };

      // Function to draw data row
      const drawDataRow = (row: SportExportDataRow, y: number) => {
        let x = startX;
        const rowData = [
          row['Sport ID'] || '',
          row['Sport Name'] || '',
          row['Slug'] || '',
          row['Is Active'] || '',
          row['Is Popular'] || '',
          row['Created Date'] || '',
        ];

        rowData.forEach((cell, i) => {
          drawTableCell(doc, cell, x, y, colWidths[i], rowHeight, {
            align: i === 0 || i === 2 || i === 5 ? 'left' : 'left',
            fontSize: 7,
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
        // Check if we need a new page
        if (currentY + rowHeight > pageHeight - 50) {
          doc.addPage();
          currentPage++;
          currentY = 50;
          // Redraw header on new page
          drawHeader(currentY);
          currentY += headerHeight;
        }

        // Draw row
        drawDataRow(row, currentY);
        currentY += rowHeight;
      });

      // Add footer with page number
      const totalPages = currentPage;
      for (let i = 1; i <= totalPages; i++) {
        doc.switchToPage(i - 1);
        doc.fontSize(8).font('Helvetica').text(
          `Page ${i} of ${totalPages}`,
          doc.page.width / 2 - 50,
          doc.page.height - 40,
          { align: 'center' }
        );
      }

      doc.end();
    } catch (error) {
      logger.error('Failed to export sports to PDF:', error);
      reject(error);
    }
  });
};

/**
 * Export sports to CSV
 */
export const exportToCSV = async (
  filters: SportExportFilters = {}
): Promise<string> => {
  try {
    const sports = await getSportsForExport(filters);
    const exportData = transformToExportData(sports);

    const tempFilePath = join(tmpdir(), `sports-${Date.now()}.csv`);

    const csvWriter = createObjectCsvWriter({
      path: tempFilePath,
      header: [
        { id: 'Sport ID', title: 'Sport ID' },
        { id: 'Sport Name', title: 'Sport Name' },
        { id: 'Slug', title: 'Slug' },
        { id: 'Logo URL', title: 'Logo URL' },
        { id: 'Is Active', title: 'Is Active' },
        { id: 'Is Popular', title: 'Is Popular' },
        { id: 'Created Date', title: 'Created Date' },
        { id: 'Updated Date', title: 'Updated Date' },
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
    logger.error('Failed to export sports to CSV:', error);
    throw error;
  }
};
