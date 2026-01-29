import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

let s3Client: S3Client | null = null;

export const getS3Client = (): S3Client | null => {
  if (s3Client) {
    return s3Client;
  }

  if (!config.aws.accessKeyId || !config.aws.secretAccessKey || !config.aws.region) {
    logger.warn('AWS S3 credentials not configured. File uploads will be disabled.');
    return null;
  }

  s3Client = new S3Client({
    region: config.aws.region,
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    },
  });

  return s3Client;
};

export interface UploadFileOptions {
  file: Express.Multer.File;
  folder?: string;
  userId?: string;
}

export const uploadFileToS3 = async ({
  file,
  folder = 'images',
  userId,
}: UploadFileOptions): Promise<string> => {
  const client = getS3Client();
  if (!client) {
    throw new Error('S3 client not configured. Please check AWS credentials in environment variables.');
  }

  if (!config.aws.s3Bucket) {
    throw new Error('S3 bucket name not configured. Please set AWS_S3_BUCKET environment variable.');
  }

  if (!file || !file.buffer) {
    throw new Error('File buffer is missing. Please ensure the file was uploaded correctly.');
  }

  const fileExtension = file.originalname.split('.').pop() || 'jpg';
  const fileName = userId
    ? `${folder}/playasport-${userId}-${uuidv4()}.${fileExtension}`
    : `${folder}/playasport-${uuidv4()}.${fileExtension}`;

  const contentType = file.mimetype || 'image/jpeg';

  try {
    const command = new PutObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: fileName,
      Body: file.buffer,
      ContentType: contentType,
      // Note: ACL is not set because many S3 buckets have ACLs disabled.
      // Public access should be configured via bucket policies instead.
    });

    await client.send(command);

    const fileUrl = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${fileName}`;
    logger.info('File uploaded to S3 successfully', { fileName, userId, bucket: config.aws.s3Bucket });
    return fileUrl;
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error';
    const errorCode = error?.name || error?.Code || 'Unknown';
    const errorDetails = {
      message: errorMessage,
      code: errorCode,
      bucket: config.aws.s3Bucket,
      region: config.aws.region,
      fileName,
    };

    logger.error('Failed to upload file to S3', errorDetails);
    
    // Provide more specific error messages
    if (errorCode === 'NoSuchBucket') {
      throw new Error(`S3 bucket "${config.aws.s3Bucket}" not found. Please verify the bucket name and region.`);
    } else if (errorCode === 'AccessDenied' || errorMessage.includes('Access Denied')) {
      throw new Error('Access denied. Please check AWS credentials and IAM permissions.');
    } else if (errorCode === 'InvalidAccessKeyId') {
      throw new Error('Invalid AWS Access Key ID. Please check your AWS_ACCESS_KEY_ID.');
    } else if (errorCode === 'SignatureDoesNotMatch') {
      throw new Error('Invalid AWS Secret Access Key. Please check your AWS_SECRET_ACCESS_KEY.');
    } else if (errorMessage.includes('ACL') || errorMessage.includes('does not allow ACLs')) {
      throw new Error('S3 bucket has ACLs disabled. Please configure public access via bucket policies instead of object ACLs.');
    } else if (errorMessage.includes('bucket')) {
      throw new Error(`S3 bucket error: ${errorMessage}`);
    }
    
    throw new Error(`Failed to upload file to S3: ${errorMessage}`);
  }
};

export const deleteFileFromS3 = async (fileUrl: string): Promise<void> => {
  const client = getS3Client();
  if (!client) {
    logger.warn('S3 client not configured. Skipping file deletion.');
    return;
  }

  try {
    const urlParts = fileUrl.split('.amazonaws.com/');
    if (urlParts.length !== 2) {
      logger.warn('Invalid S3 file URL', { fileUrl });
      return;
    }

    const fileName = urlParts[1];

    const command = new DeleteObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: fileName,
    });

    await client.send(command);
    logger.info('File deleted from S3', { fileName });
  } catch (error) {
    logger.error('Failed to delete file from S3', { fileUrl, error });
  }
};

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

export const testS3Connection = async (): Promise<S3TestResult> => {
  const result: S3TestResult = {
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
    if (!config.aws.accessKeyId || !config.aws.secretAccessKey || !config.aws.region) {
      result.tests.clientInitialization = {
        passed: false,
        message: 'AWS credentials not configured. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION.',
      };
      result.summary = 'AWS credentials are missing.';
      return result;
    }

    if (!config.aws.s3Bucket) {
      result.tests.clientInitialization = {
        passed: false,
        message: 'S3 bucket name not configured. Please set AWS_S3_BUCKET environment variable.',
      };
      result.summary = 'S3 bucket name is missing.';
      return result;
    }

    const client = getS3Client();
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
      message: `S3 client initialized successfully. Region: ${config.aws.region}`,
    };
  } catch (error: any) {
    result.tests.clientInitialization = {
      passed: false,
      message: `Failed to initialize S3 client: ${error?.message || 'Unknown error'}`,
    };
    result.summary = `Client initialization failed: ${error?.message || 'Unknown error'}`;
    return result;
  }

  const client = getS3Client()!;
  const testFileName = `test-connection-${uuidv4()}.txt`;
  const testFileKey = `test/${testFileName}`;
  const testContent = Buffer.from('S3 Connection Test File - Safe to delete');

  // Test 2: Bucket Access (HeadBucket)
  try {
    const headCommand = new HeadBucketCommand({
      Bucket: config.aws.s3Bucket,
    });
    await client.send(headCommand);
    result.tests.bucketAccess = {
      passed: true,
      message: `Bucket "${config.aws.s3Bucket}" is accessible.`,
    };
  } catch (error: any) {
    const errorCode = error?.name || error?.Code || 'Unknown';
    const errorMessage = error?.message || 'Unknown error';

    if (errorCode === 'NoSuchBucket' || errorCode === 'NotFound') {
      result.tests.bucketAccess = {
        passed: false,
        message: `Bucket "${config.aws.s3Bucket}" not found. Please verify the bucket name and region (${config.aws.region}).`,
      };
    } else if (errorCode === 'AccessDenied' || errorMessage.includes('Access Denied')) {
      result.tests.bucketAccess = {
        passed: false,
        message: 'Access denied. Please check IAM permissions for ListBucket and HeadBucket actions.',
      };
    } else {
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
    const putCommand = new PutObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: testFileKey,
      Body: testContent,
      ContentType: 'text/plain',
    });

    await client.send(putCommand);
    const testFileUrl = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${testFileKey}`;

    result.tests.writePermission = {
      passed: true,
      message: `Write permission verified. Test file uploaded: ${testFileKey}`,
      testFileUrl,
    };
  } catch (error: any) {
    const errorCode = error?.name || error?.Code || 'Unknown';
    const errorMessage = error?.message || 'Unknown error';

    if (errorCode === 'AccessDenied' || errorMessage.includes('Access Denied')) {
      result.tests.writePermission = {
        passed: false,
        message: 'Write permission denied. Please check IAM permissions for PutObject action.',
      };
    } else {
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
    const getCommand = new GetObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: testFileKey,
    });

    const response = await client.send(getCommand);
    const bodyString = await response.Body?.transformToString();

    if (bodyString === testContent.toString()) {
      result.tests.readPermission = {
        passed: true,
        message: 'Read permission verified. Test file content retrieved successfully.',
      };
    } else {
      result.tests.readPermission = {
        passed: false,
        message: 'Read permission verified but content mismatch.',
      };
    }
  } catch (error: any) {
    const errorCode = error?.name || error?.Code || 'Unknown';
    const errorMessage = error?.message || 'Unknown error';

    if (errorCode === 'AccessDenied' || errorMessage.includes('Access Denied')) {
      result.tests.readPermission = {
        passed: false,
        message: 'Read permission denied. Please check IAM permissions for GetObject action.',
      };
    } else {
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
    const deleteCommand = new DeleteObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: testFileKey,
    });

    await client.send(deleteCommand);
    result.tests.deletePermission = {
      passed: true,
      message: 'Delete permission verified. Test file deleted successfully.',
    };
  } catch (error: any) {
    const errorCode = error?.name || error?.Code || 'Unknown';
    const errorMessage = error?.message || 'Unknown error';

    if (errorCode === 'AccessDenied' || errorMessage.includes('Access Denied')) {
      result.tests.deletePermission = {
        passed: false,
        message: 'Delete permission denied. Please check IAM permissions for DeleteObject action.',
      };
    } else {
      result.tests.deletePermission = {
        passed: false,
        message: `Delete test failed: ${errorMessage} (Code: ${errorCode})`,
      };
    }
    result.summary = `Delete permission test failed: ${errorMessage}. Note: Test file may still exist in bucket.`;
  }

  // Calculate overall success
  const allTestsPassed =
    result.tests.clientInitialization.passed &&
    result.tests.bucketAccess.passed &&
    result.tests.writePermission.passed &&
    result.tests.readPermission.passed &&
    result.tests.deletePermission.passed;

  result.success = allTestsPassed;

  if (allTestsPassed) {
    result.summary = 'All S3 connection and permission tests passed successfully!';
  } else {
    const failedTests = Object.entries(result.tests)
      .filter(([_, test]) => !test.passed)
      .map(([name, _]) => name)
      .join(', ');
    result.summary = `Some tests failed: ${failedTests}. Please review the error messages above.`;
  }

  logger.info('S3 connection test completed', {
    success: result.success,
    bucket: config.aws.s3Bucket,
    region: config.aws.region,
  });

  return result;
};


