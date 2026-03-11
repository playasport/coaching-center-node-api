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
const mongoose_1 = require("mongoose");
const booking_model_1 = require("../../models/booking.model");
const coachingCenter_model_1 = require("../../models/coachingCenter.model");
const userCache_1 = require("../../utils/userCache");
const logger_1 = require("../../utils/logger");
const exceljs_1 = __importDefault(require("exceljs"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const os_1 = require("os");
const path_1 = require("path");
const csv_writer_1 = require("csv-writer");
/**
 * Helper function to clean address object (remove isDeleted, createdAt, updatedAt)
 */
const cleanAddress = (address) => {
    if (!address)
        return null;
    const { isDeleted, createdAt, updatedAt, ...cleanedAddress } = address;
    return cleanedAddress;
};
/**
 * Get enrolled users data for export
 */
const getUsersForExport = async (academyUserId, filters = {}) => {
    try {
        const userObjectId = await (0, userCache_1.getUserObjectId)(academyUserId);
        if (!userObjectId) {
            throw new Error('Academy user not found');
        }
        // Get all coaching centers owned by the user
        const coachingCenters = await coachingCenter_model_1.CoachingCenterModel.find({
            user: userObjectId,
            is_deleted: false,
        }).select('_id center_name').lean();
        if (coachingCenters.length === 0) {
            return [];
        }
        const centerIds = coachingCenters.map(center => center._id);
        // Build query for bookings
        const query = {
            center: { $in: centerIds },
            is_deleted: false,
        };
        // Filter by center if provided
        if (filters.centerId) {
            if (!mongoose_1.Types.ObjectId.isValid(filters.centerId)) {
                throw new Error('Invalid center ID');
            }
            const centerObjectId = new mongoose_1.Types.ObjectId(filters.centerId);
            if (!centerIds.some(id => id.toString() === centerObjectId.toString())) {
                throw new Error('Center does not belong to you');
            }
            query.center = centerObjectId;
        }
        // Filter by batch if provided
        if (filters.batchId) {
            if (!mongoose_1.Types.ObjectId.isValid(filters.batchId)) {
                throw new Error('Invalid batch ID');
            }
            query.batch = new mongoose_1.Types.ObjectId(filters.batchId);
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
        const bookings = await booking_model_1.BookingModel.find(query)
            .populate('user', 'id firstName lastName email mobile profileImage userType address')
            .populate('batch', 'id name')
            .sort({ createdAt: -1 })
            .lean();
        // Group by user (avoid duplicates)
        const userMap = new Map();
        for (const booking of bookings) {
            const bookingData = booking;
            if (!bookingData.user || !bookingData.user.id) {
                continue;
            }
            const userIdStr = bookingData.user.id;
            // Initialize user if not exists
            if (!userMap.has(userIdStr)) {
                userMap.set(userIdStr, {
                    id: userIdStr,
                    firstName: bookingData.user.firstName || '',
                    lastName: bookingData.user.lastName || null,
                    email: bookingData.user.email || '',
                    mobile: bookingData.user.mobile || null,
                    profileImage: bookingData.user.profileImage || null,
                    userType: bookingData.user.userType || null,
                    address: bookingData.user.address || null,
                    totalBookings: 0,
                    activeBookings: 0,
                    batchIds: new Set(),
                });
            }
            const user = userMap.get(userIdStr);
            // Count bookings
            user.totalBookings++;
            // Count active bookings
            if (bookingData.status === booking_model_1.BookingStatus.CONFIRMED) {
                user.activeBookings++;
            }
            // Track unique batch IDs
            if (bookingData.batch) {
                const batchId = bookingData.batch.id || bookingData.batch._id?.toString() || '';
                if (batchId) {
                    user.batchIds.add(batchId);
                }
            }
        }
        // Convert map to array
        let users = Array.from(userMap.values());
        // Filter by userType if provided
        if (filters.userType) {
            users = users.filter(user => user.userType === filters.userType);
        }
        // Filter by search if provided
        if (filters.search) {
            const searchLower = filters.search.toLowerCase().trim();
            users = users.filter(user => {
                const firstName = (user.firstName || '').toLowerCase();
                const lastName = (user.lastName || '').toLowerCase();
                const email = (user.email || '').toLowerCase();
                const mobile = (user.mobile || '').toLowerCase();
                return firstName.includes(searchLower) ||
                    lastName.includes(searchLower) ||
                    email.includes(searchLower) ||
                    mobile.includes(searchLower);
            });
        }
        return users;
    }
    catch (error) {
        logger_1.logger.error('Failed to get users for export:', error);
        throw error;
    }
};
/**
 * Transform user data to export format
 */
const transformToExportData = (users) => {
    return users.map((user) => {
        const address = cleanAddress(user.address);
        // Combine first and last names
        const firstName = user.firstName || '';
        const lastName = user.lastName || '';
        const name = `${firstName} ${lastName}`.trim() || '';
        return {
            'User ID': user.id || '',
            'Name': name,
            'Email': user.email || '',
            'Mobile': user.mobile || '',
            'User Type': user.userType || 'N/A',
            'City': address?.city || '',
            'State': address?.state || '',
            'Country': address?.country || '',
            'Pincode': address?.pincode || '',
            'Total Bookings': user.totalBookings || 0,
            'Active Bookings': user.activeBookings || 0,
            'Enrolled Batches': user.batchIds?.size || 0,
        };
    });
};
/**
 * Export users to Excel
 */
const exportToExcel = async (academyUserId, filters = {}) => {
    try {
        const users = await getUsersForExport(academyUserId, filters);
        const exportData = transformToExportData(users);
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet('Enrolled Users');
        // Define columns
        worksheet.columns = [
            { header: 'User ID', key: 'User ID', width: 30 },
            { header: 'Name', key: 'Name', width: 25 },
            { header: 'Email', key: 'Email', width: 30 },
            { header: 'Mobile', key: 'Mobile', width: 15 },
            { header: 'User Type', key: 'User Type', width: 15 },
            { header: 'City', key: 'City', width: 20 },
            { header: 'State', key: 'State', width: 20 },
            { header: 'Country', key: 'Country', width: 20 },
            { header: 'Pincode', key: 'Pincode', width: 10 },
            { header: 'Total Bookings', key: 'Total Bookings', width: 15 },
            { header: 'Active Bookings', key: 'Active Bookings', width: 15 },
            { header: 'Enrolled Batches', key: 'Enrolled Batches', width: 15 },
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
    const maxTextWidth = width - 8;
    let displayText = text || '';
    if (bold) {
        doc.font('Helvetica-Bold').fontSize(fontSize);
    }
    else {
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
    }
    else if (align === 'right') {
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
 * Export users to PDF
 */
const exportToPDF = async (academyUserId, filters = {}) => {
    return new Promise(async (resolve, reject) => {
        try {
            const users = await getUsersForExport(academyUserId, filters);
            const exportData = transformToExportData(users);
            const doc = new pdfkit_1.default({
                margin: 50,
                size: 'A4',
                layout: 'landscape'
            });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            // Title
            doc.fontSize(18).font('Helvetica-Bold').text('Enrolled Users Report', { align: 'center' });
            doc.moveDown(0.5);
            // Date range info
            if (filters.startDate || filters.endDate) {
                doc.fontSize(10).font('Helvetica').text(`Date Range: ${filters.startDate || 'N/A'} to ${filters.endDate || 'N/A'}`, { align: 'center' });
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
            // Column widths
            const colWidths = [
                pageWidth * 0.15, // User ID
                pageWidth * 0.15, // Name
                pageWidth * 0.15, // Email
                pageWidth * 0.10, // Mobile
                pageWidth * 0.12, // User Type
                pageWidth * 0.13, // Total Bookings
            ];
            // Table headers
            const headers = [
                'User ID',
                'Name',
                'Email',
                'Mobile',
                'User Type',
                'Total Bookings',
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
                    row['User ID'] || '',
                    row['Name'] || '',
                    row['Email'] || '',
                    row['Mobile'] || '',
                    row['User Type'] || '',
                    (row['Total Bookings'] || 0).toString(),
                ];
                rowData.forEach((cell, i) => {
                    drawTableCell(doc, cell, x, y, colWidths[i], rowHeight, {
                        align: 'left',
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
 * Export users to CSV
 */
const exportToCSV = async (academyUserId, filters = {}) => {
    try {
        const users = await getUsersForExport(academyUserId, filters);
        const exportData = transformToExportData(users);
        const tempFilePath = (0, path_1.join)((0, os_1.tmpdir)(), `enrolled-users-${Date.now()}.csv`);
        const csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
            path: tempFilePath,
            header: [
                { id: 'User ID', title: 'User ID' },
                { id: 'Name', title: 'Name' },
                { id: 'Email', title: 'Email' },
                { id: 'Mobile', title: 'Mobile' },
                { id: 'User Type', title: 'User Type' },
                { id: 'City', title: 'City' },
                { id: 'State', title: 'State' },
                { id: 'Country', title: 'Country' },
                { id: 'Pincode', title: 'Pincode' },
                { id: 'Total Bookings', title: 'Total Bookings' },
                { id: 'Active Bookings', title: 'Active Bookings' },
                { id: 'Enrolled Batches', title: 'Enrolled Batches' },
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
//# sourceMappingURL=userExport.service.js.map