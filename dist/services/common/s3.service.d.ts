import { S3Client } from '@aws-sdk/client-s3';
export declare const getS3Client: () => S3Client | null;
export interface UploadFileOptions {
    file: Express.Multer.File;
    folder?: string;
    userId?: string;
}
export interface UploadBufferOptions {
    buffer: Buffer;
    folder?: string;
    contentType: string;
    /** e.g. 'jpg', 'png', 'pdf'. Derived from contentType if not provided. */
    fileExtension?: string;
}
/**
 * Upload a buffer to S3 (e.g. WhatsApp media downloaded from Meta).
 * Returns the public S3 URL or throws if S3 is not configured / upload fails.
 */
export declare const uploadBufferToS3: ({ buffer, folder, contentType, fileExtension, }: UploadBufferOptions) => Promise<string>;
export declare const uploadFileToS3: ({ file, folder, userId, }: UploadFileOptions) => Promise<string>;
export declare const deleteFileFromS3: (fileUrl: string) => Promise<void>;
export interface S3TestResult {
    success: boolean;
    tests: {
        clientInitialization: {
            passed: boolean;
            message: string;
        };
        bucketAccess: {
            passed: boolean;
            message: string;
        };
        writePermission: {
            passed: boolean;
            message: string;
            testFileUrl?: string;
        };
        readPermission: {
            passed: boolean;
            message: string;
        };
        deletePermission: {
            passed: boolean;
            message: string;
        };
    };
    summary: string;
}
export declare const testS3Connection: () => Promise<S3TestResult>;
//# sourceMappingURL=s3.service.d.ts.map