"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testS3Connection = exports.deleteFileFromS3 = exports.uploadFileToS3 = exports.getS3Client = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const env_1 = require("../../config/env");
const logger_1 = require("../../utils/logger");
const uuid_1 = require("uuid");
let s3Client = null;
const getS3Client = () => {
    if (s3Client) {
        return s3Client;
    }
    if (!env_1.config.aws.accessKeyId || !env_1.config.aws.secretAccessKey || !env_1.config.aws.region) {
        logger_1.logger.warn('AWS S3 credentials not configured. File uploads will be disabled.');
        return null;
    }
    s3Client = new client_s3_1.S3Client({
        region: env_1.config.aws.region,
        credentials: {
            accessKeyId: env_1.config.aws.accessKeyId,
            secretAccessKey: env_1.config.aws.secretAccessKey,
        },
    });
    return s3Client;
};
exports.getS3Client = getS3Client;
const uploadFileToS3 = async ({ file, folder = 'images', userId, }) => {
    const client = (0, exports.getS3Client)();
    if (!client) {
        throw new Error('S3 client not configured. Please check AWS credentials in environment variables.');
    }
    if (!env_1.config.aws.s3Bucket) {
        throw new Error('S3 bucket name not configured. Please set AWS_S3_BUCKET environment variable.');
    }
    if (!file || !file.buffer) {
        throw new Error('File buffer is missing. Please ensure the file was uploaded correctly.');
    }
    const fileExtension = file.originalname.split('.').pop() || 'jpg';
    const fileName = userId
        ? `${folder}/playasport-${userId}-${(0, uuid_1.v4)()}.${fileExtension}`
        : `${folder}/playasport-${(0, uuid_1.v4)()}.${fileExtension}`;
    const contentType = file.mimetype || 'image/jpeg';
    try {
        const command = new client_s3_1.PutObjectCommand({
            Bucket: env_1.config.aws.s3Bucket,
            Key: fileName,
            Body: file.buffer,
            ContentType: contentType,
            // Note: ACL is not set because many S3 buckets have ACLs disabled.
            // Public access should be configured via bucket policies instead.
        });
        await client.send(command);
        const fileUrl = `https://${env_1.config.aws.s3Bucket}.s3.${env_1.config.aws.region}.amazonaws.com/${fileName}`;
        logger_1.logger.info('File uploaded to S3 successfully', { fileName, userId, bucket: env_1.config.aws.s3Bucket });
        return fileUrl;
    }
    catch (error) {
        const errorMessage = error?.message || 'Unknown error';
        const errorCode = error?.name || error?.Code || 'Unknown';
        const errorDetails = {
            message: errorMessage,
            code: errorCode,
            bucket: env_1.config.aws.s3Bucket,
            region: env_1.config.aws.region,
            fileName,
        };
        logger_1.logger.error('Failed to upload file to S3', errorDetails);
        // Provide more specific error messages
        if (errorCode === 'NoSuchBucket') {
            throw new Error(`S3 bucket "${env_1.config.aws.s3Bucket}" not found. Please verify the bucket name and region.`);
        }
        else if (errorCode === 'AccessDenied' || errorMessage.includes('Access Denied')) {
            throw new Error('Access denied. Please check AWS credentials and IAM permissions.');
        }
        else if (errorCode === 'InvalidAccessKeyId') {
            throw new Error('Invalid AWS Access Key ID. Please check your AWS_ACCESS_KEY_ID.');
        }
        else if (errorCode === 'SignatureDoesNotMatch') {
            throw new Error('Invalid AWS Secret Access Key. Please check your AWS_SECRET_ACCESS_KEY.');
        }
        else if (errorMessage.includes('ACL') || errorMessage.includes('does not allow ACLs')) {
            throw new Error('S3 bucket has ACLs disabled. Please configure public access via bucket policies instead of object ACLs.');
        }
        else if (errorMessage.includes('bucket')) {
            throw new Error(`S3 bucket error: ${errorMessage}`);
        }
        throw new Error(`Failed to upload file to S3: ${errorMessage}`);
    }
};
exports.uploadFileToS3 = uploadFileToS3;
const deleteFileFromS3 = async (fileUrl) => {
    const client = (0, exports.getS3Client)();
    if (!client) {
        logger_1.logger.warn('S3 client not configured. Skipping file deletion.');
        return;
    }
    try {
        const urlParts = fileUrl.split('.amazonaws.com/');
        if (urlParts.length !== 2) {
            logger_1.logger.warn('Invalid S3 file URL', { fileUrl });
            return;
        }
        const fileName = urlParts[1];
        const command = new client_s3_1.DeleteObjectCommand({
            Bucket: env_1.config.aws.s3Bucket,
            Key: fileName,
        });
        await client.send(command);
        logger_1.logger.info('File deleted from S3', { fileName });
    }
    catch (error) {
        logger_1.logger.error('Failed to delete file from S3', { fileUrl, error });
    }
};
exports.deleteFileFromS3 = deleteFileFromS3;
const testS3Connection = async () => {
    const result = {
        success: false,
        tests: {
            clientInitialization: { passed: false, message: '' },
            bucketAccess: { passed: false, message: '' },
            writePermission: { passed: false, message: '' },
            readPermission: { passed: false, message: '' },
            deletePermission: { passed: false, message: '' },
        },
        summary: '',
    };
    // Test 1: Client Initialization
    try {
        if (!env_1.config.aws.accessKeyId || !env_1.config.aws.secretAccessKey || !env_1.config.aws.region) {
            result.tests.clientInitialization = {
                passed: false,
                message: 'AWS credentials not configured. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION.',
            };
            result.summary = 'AWS credentials are missing.';
            return result;
        }
        if (!env_1.config.aws.s3Bucket) {
            result.tests.clientInitialization = {
                passed: false,
                message: 'S3 bucket name not configured. Please set AWS_S3_BUCKET environment variable.',
            };
            result.summary = 'S3 bucket name is missing.';
            return result;
        }
        const client = (0, exports.getS3Client)();
        if (!client) {
            result.tests.clientInitialization = {
                passed: false,
                message: 'Failed to initialize S3 client.',
            };
            result.summary = 'Failed to initialize S3 client.';
            return result;
        }
        result.tests.clientInitialization = {
            passed: true,
            message: `S3 client initialized successfully. Region: ${env_1.config.aws.region}`,
        };
    }
    catch (error) {
        result.tests.clientInitialization = {
            passed: false,
            message: `Failed to initialize S3 client: ${error?.message || 'Unknown error'}`,
        };
        result.summary = `Client initialization failed: ${error?.message || 'Unknown error'}`;
        return result;
    }
    const client = (0, exports.getS3Client)();
    const testFileName = `test-connection-${(0, uuid_1.v4)()}.txt`;
    const testFileKey = `test/${testFileName}`;
    const testContent = Buffer.from('S3 Connection Test File - Safe to delete');
    // Test 2: Bucket Access (HeadBucket)
    try {
        const headCommand = new client_s3_1.HeadBucketCommand({
            Bucket: env_1.config.aws.s3Bucket,
        });
        await client.send(headCommand);
        result.tests.bucketAccess = {
            passed: true,
            message: `Bucket "${env_1.config.aws.s3Bucket}" is accessible.`,
        };
    }
    catch (error) {
        const errorCode = error?.name || error?.Code || 'Unknown';
        const errorMessage = error?.message || 'Unknown error';
        if (errorCode === 'NoSuchBucket' || errorCode === 'NotFound') {
            result.tests.bucketAccess = {
                passed: false,
                message: `Bucket "${env_1.config.aws.s3Bucket}" not found. Please verify the bucket name and region (${env_1.config.aws.region}).`,
            };
        }
        else if (errorCode === 'AccessDenied' || errorMessage.includes('Access Denied')) {
            result.tests.bucketAccess = {
                passed: false,
                message: 'Access denied. Please check IAM permissions for ListBucket and HeadBucket actions.',
            };
        }
        else {
            result.tests.bucketAccess = {
                passed: false,
                message: `Bucket access failed: ${errorMessage} (Code: ${errorCode})`,
            };
        }
        result.summary = `Bucket access test failed: ${errorMessage}`;
        return result;
    }
    // Test 3: Write Permission (PutObject)
    try {
        const putCommand = new client_s3_1.PutObjectCommand({
            Bucket: env_1.config.aws.s3Bucket,
            Key: testFileKey,
            Body: testContent,
            ContentType: 'text/plain',
        });
        await client.send(putCommand);
        const testFileUrl = `https://${env_1.config.aws.s3Bucket}.s3.${env_1.config.aws.region}.amazonaws.com/${testFileKey}`;
        result.tests.writePermission = {
            passed: true,
            message: `Write permission verified. Test file uploaded: ${testFileKey}`,
            testFileUrl,
        };
    }
    catch (error) {
        const errorCode = error?.name || error?.Code || 'Unknown';
        const errorMessage = error?.message || 'Unknown error';
        if (errorCode === 'AccessDenied' || errorMessage.includes('Access Denied')) {
            result.tests.writePermission = {
                passed: false,
                message: 'Write permission denied. Please check IAM permissions for PutObject action.',
            };
        }
        else {
            result.tests.writePermission = {
                passed: false,
                message: `Write test failed: ${errorMessage} (Code: ${errorCode})`,
            };
        }
        result.summary = `Write permission test failed: ${errorMessage}`;
        // Try to clean up if write failed
        return result;
    }
    // Test 4: Read Permission (GetObject)
    try {
        const getCommand = new client_s3_1.GetObjectCommand({
            Bucket: env_1.config.aws.s3Bucket,
            Key: testFileKey,
        });
        const response = await client.send(getCommand);
        const bodyString = await response.Body?.transformToString();
        if (bodyString === testContent.toString()) {
            result.tests.readPermission = {
                passed: true,
                message: 'Read permission verified. Test file content retrieved successfully.',
            };
        }
        else {
            result.tests.readPermission = {
                passed: false,
                message: 'Read permission verified but content mismatch.',
            };
        }
    }
    catch (error) {
        const errorCode = error?.name || error?.Code || 'Unknown';
        const errorMessage = error?.message || 'Unknown error';
        if (errorCode === 'AccessDenied' || errorMessage.includes('Access Denied')) {
            result.tests.readPermission = {
                passed: false,
                message: 'Read permission denied. Please check IAM permissions for GetObject action.',
            };
        }
        else {
            result.tests.readPermission = {
                passed: false,
                message: `Read test failed: ${errorMessage} (Code: ${errorCode})`,
            };
        }
        result.summary = `Read permission test failed: ${errorMessage}`;
        // Continue to delete test file even if read failed
    }
    // Test 5: Delete Permission (DeleteObject)
    try {
        const deleteCommand = new client_s3_1.DeleteObjectCommand({
            Bucket: env_1.config.aws.s3Bucket,
            Key: testFileKey,
        });
        await client.send(deleteCommand);
        result.tests.deletePermission = {
            passed: true,
            message: 'Delete permission verified. Test file deleted successfully.',
        };
    }
    catch (error) {
        const errorCode = error?.name || error?.Code || 'Unknown';
        const errorMessage = error?.message || 'Unknown error';
        if (errorCode === 'AccessDenied' || errorMessage.includes('Access Denied')) {
            result.tests.deletePermission = {
                passed: false,
                message: 'Delete permission denied. Please check IAM permissions for DeleteObject action.',
            };
        }
        else {
            result.tests.deletePermission = {
                passed: false,
                message: `Delete test failed: ${errorMessage} (Code: ${errorCode})`,
            };
        }
        result.summary = `Delete permission test failed: ${errorMessage}. Note: Test file may still exist in bucket.`;
    }
    // Calculate overall success
    const allTestsPassed = result.tests.clientInitialization.passed &&
        result.tests.bucketAccess.passed &&
        result.tests.writePermission.passed &&
        result.tests.readPermission.passed &&
        result.tests.deletePermission.passed;
    result.success = allTestsPassed;
    if (allTestsPassed) {
        result.summary = 'All S3 connection and permission tests passed successfully!';
    }
    else {
        const failedTests = Object.entries(result.tests)
            .filter(([_, test]) => !test.passed)
            .map(([name, _]) => name)
            .join(', ');
        result.summary = `Some tests failed: ${failedTests}. Please review the error messages above.`;
    }
    logger_1.logger.info('S3 connection test completed', {
        success: result.success,
        bucket: env_1.config.aws.s3Bucket,
        region: env_1.config.aws.region,
    });
    return result;
};
exports.testS3Connection = testS3Connection;
//# sourceMappingURL=s3.service.js.map