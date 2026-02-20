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

const trimUrl = (url: string | undefined) => url?.trim().replace(/\/+$/, '') || '';

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  defaultLocale: (process.env.DEFAULT_LOCALE || 'en') as 'en' | 'hi',
  cors: {
    allowedOrigins: (() => {
      if (process.env.NODE_ENV !== 'production') return true;
      const origins = [trimUrl(process.env.MAIN_SITE_URL), trimUrl(process.env.ACADEMY_SITE_URL), trimUrl(process.env.ADMIN_PANEL_URL), trimUrl("https://www.playasport.in")].filter(Boolean);
      return origins.length > 0 ? origins : true;
    })(),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'your-refresh-secret-key',
    accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d', // Default for web
    mobileRefreshTokenExpiresIn: process.env.JWT_MOBILE_REFRESH_EXPIRES_IN || '90d', // Longer for mobile apps (30d, 60d, 90d, 180d)
  },
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000), // 15 minutes
    maxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 100), // 100 requests per window
    loginMaxAttempts: Number(process.env.RATE_LIMIT_LOGIN_MAX || 5), // 5 login attempts per window
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
  otp: {
    expiryMinutes: Number(process.env.OTP_EXPIRY_MINUTES || 10), // Used for both SMS and email OTP
  },
  email: {
    enabled: parseBoolean(process.env.EMAIL_ENABLED, true),
    from: process.env.EMAIL_FROM || '',
    fromName: process.env.EMAIL_SENDER_NAME || 'Play A Sport',
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
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    // Shared connection settings
    connection: {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    },
    // Database assignments for different services
    db: {
      bullmq: Number(process.env.REDIS_DB_BULLMQ || 0), // DB 0: BullMQ (thumbnail queue)
      userCache: Number(process.env.REDIS_DB_USER_CACHE || 1), // DB 1: User cache
      tokenBlacklist: Number(process.env.REDIS_DB_TOKEN_BLACKLIST || 2), // DB 2: Token blacklist
      rateLimit: Number(process.env.REDIS_DB_RATE_LIMIT || 3), // DB 3: Rate limiting
      permissionCache: Number(process.env.REDIS_DB_PERMISSION_CACHE || 4), // DB 4: Permission cache
    },
  },
  pagination: {
    defaultLimit: Number(process.env.PAGINATION_DEFAULT_LIMIT || 10),
    maxLimit: Number(process.env.PAGINATION_MAX_LIMIT || 100),
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  },
  payment: {
    gateway: (process.env.PAYMENT_GATEWAY || 'razorpay') as 'razorpay' | 'stripe' | 'payu' | 'cashfree',
    // Add other payment gateway configs here in the future
    // stripe: {
    //   apiKey: process.env.STRIPE_API_KEY || '',
    //   secretKey: process.env.STRIPE_SECRET_KEY || '',
    // },
  },
  booking: {
    platformFee: Number(process.env.PLATFORM_FEE || 200), // Default platform fee
    gstPercentage: Number(process.env.GST_PERCENTAGE || 18), // Default GST percentage
  },
  location: {
    defaultRadius: Number(process.env.DEFAULT_SEARCH_RADIUS_KM || 50), // Default search radius in kilometers
    maxRadius: Number(process.env.MAX_SEARCH_RADIUS_KM || 200), // Maximum allowed search radius in kilometers
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '', // For Distance Matrix API (road distance); empty = use Haversine fallback
  },
  notification: {
    enabled: parseBoolean(process.env.NOTIFICATION_ENABLED, true),
    maxRetries: Number(process.env.NOTIFICATION_MAX_RETRIES || 3),
    whatsapp: {
      enabled: parseBoolean(process.env.WHATSAPP_ENABLED, true),
    },
    push: {
      enabled: parseBoolean(process.env.PUSH_NOTIFICATION_ENABLED, true),
    },
  },
  admin: {
    email: process.env.ADMIN_EMAIL || '',
  },
  videoProcessing: {
    concurrency: Number(process.env.VIDEO_PROCESSING_CONCURRENCY || 2), // Number of videos to process simultaneously
  },
  meilisearch: {
    enabled: parseBoolean(process.env.MEILISEARCH_ENABLED, false), // Enable/disable Meilisearch indexing
    host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
    apiKey: process.env.MEILISEARCH_KEY || 'DevLOpemNTmasterKey123',
    indexingConcurrency: Number(process.env.MEILISEARCH_INDEXING_CONCURRENCY || 5), // Number of indexing jobs to process concurrently
  },
};
