"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportToCSV = exports.exportToPDF = exports.exportToExcel = void 0;
const coachingCenter_model_1 = require("../../models/coachingCenter.model");
const userCache_1 = require("../../utils/userCache");
const mongoose_1 = require("mongoose");
const logger_1 = require("../../utils/logger");
const exceljs_1 = __importDefault(require("exceljs"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const os_1 = require("os");
const path_1 = require("path");
const csv_writer_1 = require("csv-writer");
/**
 * Get coaching centers data for export
 */
const getCoachingCentersForExport = async (filters = {}, currentUserId, currentUserRole) => {
    try {
        const query = { is_deleted: false };
        // If user is an agent, only show centers added by them
        if (currentUserRole === 'agent' && currentUserId) {
            const currentUserObjectId = await (0, userCache_1.getUserObjectId)(currentUserId);
            if (currentUserObjectId) {
                query.addedBy = currentUserObjectId;
            }
        }
        // Apply filters
        if (filters.userId) {
            const userObjectId = await (0, userCache_1.getUserObjectId)(filters.userId);
            if (userObjectId) {
                query.user = userObjectId;
            }
        }
        if (filters.status) {
            query.status = filters.status;
        }
        if (filters.isActive !== undefined) {
            query.is_active = filters.isActive;
        }
        if (filters.isApproved !== undefined) {
            // Convert isApproved boolean to approval_status
            query.approval_status = filters.isApproved ? 'approved' : { $in: ['rejected', 'pending_approval'] };
        }
        if (filters.approvalStatus) {
            query.approval_status = filters.approvalStatus;
        }
        if (filters.sportId) {
            query.sports = new mongoose_1.Types.ObjectId(filters.sportId);
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
        // Search filter
        if (filters.search) {
            query.$or = [
                { center_name: { $regex: filters.search, $options: 'i' } },
                { email: { $regex: filters.search, $options: 'i' } },
                { mobile_number: { $regex: filters.search, $options: 'i' } },
            ];
        }
        const coachingCenters = await coachingCenter_model_1.CoachingCenterModel.find(query)
            .populate('user', 'firstName lastName email mobile')
            .populate('sports', 'name')
            .sort({ createdAt: -1 })
            .lean();
        // Filter deleted media - using inline filtering since helpers are not exported
        return coachingCenters.map((center) => {
            // Filter deleted documents
            if (center.documents && Array.isArray(center.documents)) {
                center.documents = center.documents.filter((doc) => !doc.is_deleted);
            }
            // Filter deleted images and videos, and sort images so banner images appear first
            if (center.sport_details && Array.isArray(center.sport_details)) {
                center.sport_details = center.sport_details.map((sportDetail) => {
                    // Filter deleted images
                    if (sportDetail.images && Array.isArray(sportDetail.images)) {
                        sportDetail.images = sportDetail.images.filter((img) => !img.is_deleted);
                        // Sort so banner images appear first
                        sportDetail.images.sort((a, b) => {
                            if (a.is_banner && !b.is_banner)
                                return -1;
                            if (!a.is_banner && b.is_banner)
                                return 1;
                            return 0;
                        });
                    }
                    // Filter deleted videos
                    if (sportDetail.videos && Array.isArray(sportDetail.videos)) {
                        sportDetail.videos = sportDetail.videos.filter((vid) => !vid.is_deleted);
                    }
                    return sportDetail;
                });
            }
            return center;
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get coaching centers for export:', error);
        throw error;
    }
};
/**
 * Transform coaching center data to export format
 */
const transformToExportData = (centers) => {
    return centers.map((center) => ({
        'Center ID': center.id || center._id?.toString() || '',
        'Center Name': center.center_name || '',
        'Email': center.email || '',
        'Mobile Number': center.mobile_number || '',
        'Owner Name': center.user
            ? `${center.user.firstName || ''} ${center.user.lastName || ''}`.trim()
            : '',
        'Owner Email': center.user?.email || '',
        'Owner Mobile': center.user?.mobile || '',
        'Status': center.status || '',
        'Active': center.is_active ? 'Yes' : 'No',
        'Sports': center.sports?.map((s) => s.name || '').join(', ') || '',
        'City': center.location?.address?.city || '',
        'State': center.location?.address?.state || '',
        'Country': center.location?.address?.country || '',
        'Pincode': center.location?.address?.pincode || '',
        'Experience (Years)': center.experience || 0,
        'Created Date': center.createdAt ? new Date(center.createdAt).toLocaleString() : '',
        'Updated Date': center.updatedAt ? new Date(center.updatedAt).toLocaleString() : '',
    }));
};
/**
 * Export coaching centers to Excel
 */
const exportToExcel = async (filters = {}, currentUserId, currentUserRole) => {
    try {
        const centers = await getCoachingCentersForExport(filters, currentUserId, currentUserRole);
        const exportData = transformToExportData(centers);
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet('Coaching Centers');
        // Define columns
        worksheet.columns = [
            { header: 'Center ID', key: 'Center ID', width: 30 },
            { header: 'Center Name', key: 'Center Name', width: 30 },
            { header: 'Email', key: 'Email', width: 30 },
            { header: 'Mobile Number', key: 'Mobile Number', width: 15 },
            { header: 'Owner Name', key: 'Owner Name', width: 25 },
            { header: 'Owner Email', key: 'Owner Email', width: 30 },
            { header: 'Owner Mobile', key: 'Owner Mobile', width: 15 },
            { header: 'Status', key: 'Status', width: 12 },
            { header: 'Active', key: 'Active', width: 10 },
            { header: 'Sports', key: 'Sports', width: 30 },
            { header: 'City', key: 'City', width: 20 },
            { header: 'State', key: 'State', width: 20 },
            { header: 'Country', key: 'Country', width: 20 },
            { header: 'Pincode', key: 'Pincode', width: 10 },
            { header: 'Experience (Years)', key: 'Experience (Years)', width: 15 },
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
    }
    catch (error) {
        logger_1.logger.error('Failed to export to Excel:', error);
        throw error;
    }
};
exports.exportToExcel = exportToExcel;
/**
 * Helper function to draw table cell with border
 */
const drawTableCell = (doc, text, x, y, width, height, options = {}) => {
    const { align = 'left', fontSize = 8, bold = false } = options;
    // Truncate text if too long to fit in cell
    const maxTextWidth = width - 8;
    let displayText = text || '';
    // Set font to measure text
    if (bold) {
        doc.font('Helvetica-Bold').fontSize(fontSize);
    }
    else {
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
    }
    else if (align === 'right') {
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
 * Export coaching centers to PDF
 */
const exportToPDF = async (filters = {}, currentUserId, currentUserRole) => {
    return new Promise(async (resolve, reject) => {
        try {
            const centers = await getCoachingCentersForExport(filters, currentUserId, currentUserRole);
            const exportData = transformToExportData(centers);
            const doc = new pdfkit_1.default({
                margin: 50,
                size: 'A4',
                layout: 'landscape' // Use landscape for better table width
            });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            // Title
            doc.fontSize(18).font('Helvetica-Bold').text('Coaching Centers Report', { align: 'center' });
            doc.moveDown(0.5);
            // Date range info
            if (filters.startDate || filters.endDate) {
                doc.fontSize(10).font('Helvetica').text(`Date Range: ${filters.startDate || 'N/A'} to ${filters.endDate || 'N/A'}`, { align: 'center' });
                doc.moveDown(0.5);
            }
            doc.fontSize(10).text(`Total Records: ${exportData.length}`, { align: 'center' });
            doc.moveDown(1);
            // Table configuration
            const pageWidth = doc.page.width - 100; // Account for margins
            const pageHeight = doc.page.height - 100;
            const startX = 50;
            const startY = doc.y;
            const rowHeight = 20;
            const headerHeight = 25;
            // Column widths (proportional to page width)
            const colWidths = [
                pageWidth * 0.12, // Center ID
                pageWidth * 0.15, // Center Name
                pageWidth * 0.15, // Email
                pageWidth * 0.10, // Mobile Number
                pageWidth * 0.12, // Owner Name
                pageWidth * 0.08, // Status
                pageWidth * 0.06, // Active
                pageWidth * 0.10, // City
                pageWidth * 0.12, // Created Date
            ];
            // Table headers
            const headers = [
                'Center ID',
                'Center Name',
                'Email',
                'Mobile',
                'Owner Name',
                'Status',
                'Active',
                'City',
                'Created Date',
            ];
            let currentY = startY;
            let currentPage = 1;
            // Function to draw header row
            const drawHeader = (y) => {
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
            const drawDataRow = (row, y) => {
                let x = startX;
                const rowData = [
                    row['Center ID'] || '',
                    row['Center Name'] || '',
                    row['Email'] || '',
                    row['Mobile Number'] || '',
                    row['Owner Name'] || '',
                    row['Status'] || '',
                    row['Active'] || '',
                    row['City'] || '',
                    row['Created Date'] || '',
                ];
                rowData.forEach((cell, i) => {
                    drawTableCell(doc, cell, x, y, colWidths[i], rowHeight, {
                        align: i === 0 || i === 4 || i === 8 ? 'left' : 'left', // All left aligned
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
                doc.fontSize(8).font('Helvetica').text(`Page ${i} of ${totalPages}`, doc.page.width / 2 - 50, doc.page.height - 40, { align: 'center' });
            }
            doc.end();
        }
        catch (error) {
            logger_1.logger.error('Failed to export to PDF:', error);
            reject(error);
        }
    });
};
exports.exportToPDF = exportToPDF;
/**
 * Export coaching centers to CSV
 */
const exportToCSV = async (filters = {}, currentUserId, currentUserRole) => {
    try {
        const centers = await getCoachingCentersForExport(filters, currentUserId, currentUserRole);
        const exportData = transformToExportData(centers);
        const tempFilePath = (0, path_1.join)((0, os_1.tmpdir)(), `coaching-centers-${Date.now()}.csv`);
        const csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
            path: tempFilePath,
            header: [
                { id: 'Center ID', title: 'Center ID' },
                { id: 'Center Name', title: 'Center Name' },
                { id: 'Email', title: 'Email' },
                { id: 'Mobile Number', title: 'Mobile Number' },
                { id: 'Owner Name', title: 'Owner Name' },
                { id: 'Owner Email', title: 'Owner Email' },
                { id: 'Owner Mobile', title: 'Owner Mobile' },
                { id: 'Status', title: 'Status' },
                { id: 'Active', title: 'Active' },
                { id: 'Sports', title: 'Sports' },
                { id: 'City', title: 'City' },
                { id: 'State', title: 'State' },
                { id: 'Country', title: 'Country' },
                { id: 'Pincode', title: 'Pincode' },
                { id: 'Experience (Years)', title: 'Experience (Years)' },
                { id: 'Created Date', title: 'Created Date' },
                { id: 'Updated Date', title: 'Updated Date' },
            ],
        });
        await csvWriter.writeRecords(exportData);
        // Read file and return as string
        const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
        const csvContent = await fs.readFile(tempFilePath, 'utf-8');
        // Clean up temp file
        await fs.unlink(tempFilePath).catch(() => { });
        return csvContent;
    }
    catch (error) {
        logger_1.logger.error('Failed to export to CSV:', error);
        throw error;
    }
};
exports.exportToCSV = exportToCSV;
//# sourceMappingURL=coachingCenterExport.service.js.map