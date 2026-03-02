export interface UploadFileOptions {
    file: Express.Multer.File;
    folder?: string;
    userId?: string;
}
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