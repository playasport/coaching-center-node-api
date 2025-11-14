import dotenv from 'dotenv';

dotenv.config();

const parseBoolean = (value: string | undefined, defaultValue = true): boolean => {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();

  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }

  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  return defaultValue;
};

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  defaultLocale: (process.env.DEFAULT_LOCALE || 'en') as 'en' | 'hi',
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  database: {
    mongoUri:
      process.env.MONGO_URI || 'mongodb://localhost:27017/coaching_center_panel',
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromPhone: process.env.TWILIO_FROM_PHONE || '',
  },
  sms: {
    enabled: parseBoolean(process.env.SMS_ENABLED, true),
  },
  email: {
    enabled: parseBoolean(process.env.EMAIL_ENABLED, true),
    from: process.env.EMAIL_FROM || '',
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    username: process.env.EMAIL_USERNAME || '',
    password: process.env.EMAIL_PASSWORD || '',
    secure: parseBoolean(process.env.EMAIL_SECURE, false),
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1',
    s3Bucket: process.env.AWS_S3_BUCKET || '',
  },
  media: {
    // File size limits in bytes
    maxImageSize: Number(process.env.MAX_IMAGE_SIZE_MB || 5) * 1024 * 1024, // Default: 5MB
    maxVideoSize: Number(process.env.MAX_VIDEO_SIZE_MB || 100) * 1024 * 1024, // Default: 100MB
    maxDocumentSize: Number(process.env.MAX_DOCUMENT_SIZE_MB || 10) * 1024 * 1024, // Default: 10MB
    maxProfileImageSize: Number(process.env.MAX_PROFILE_IMAGE_SIZE_MB || 5) * 1024 * 1024, // Default: 5MB
    
    // File count limits
    maxImagesCount: Number(process.env.MAX_IMAGES_COUNT || 10), // Default: 10
    maxVideosCount: Number(process.env.MAX_VIDEOS_COUNT || 10), // Default: 10
    maxDocumentsCount: Number(process.env.MAX_DOCUMENTS_COUNT || 10), // Default: 10
    maxTotalFilesCount: Number(process.env.MAX_TOTAL_FILES_COUNT || 30), // Default: 30 (logo + images + videos + documents)
    
    // Image compression settings
    imageCompression: {
      maxWidth: Number(process.env.IMAGE_MAX_WIDTH || 1500), // Default: 1500px
      maxSizeKB: Number(process.env.IMAGE_MAX_SIZE_KB || 500), // Default: 500KB
    },
  },
};
