/**
 * Upload certification document to S3
 * Files are saved in temp/images/coaching/employee/ folder
 */
export declare const uploadCertificationFile: (file: Express.Multer.File) => Promise<string>;
/**
 * Upload multiple certification files
 */
export declare const uploadMultipleCertificationFiles: (files: Express.Multer.File[]) => Promise<string[]>;
//# sourceMappingURL=employeeMedia.service.d.ts.map