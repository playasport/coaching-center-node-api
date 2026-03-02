export declare const config: {
    port: string | number;
    nodeEnv: string;
    defaultLocale: "en" | "hi";
    mainSiteUrl: string;
    cors: {
        allowedOrigins: boolean | string[];
    };
    jwt: {
        secret: string;
        refreshSecret: string;
        accessTokenExpiresIn: string;
        refreshTokenExpiresIn: string;
        mobileRefreshTokenExpiresIn: string;
    };
    rateLimit: {
        windowMs: number;
        maxRequests: number;
        loginMaxAttempts: number;
    };
    database: {
        mongoUri: string;
    };
    twilio: {
        accountSid: string;
        authToken: string;
        fromPhone: string;
    };
    sms: {
        enabled: boolean;
    };
    otp: {
        expiryMinutes: number;
    };
    email: {
        enabled: boolean;
        from: string;
        fromName: string;
        host: string;
        port: number;
        username: string;
        password: string;
        secure: boolean;
    };
    aws: {
        accessKeyId: string;
        secretAccessKey: string;
        region: string;
        s3Bucket: string;
    };
    media: {
        maxImageSize: number;
        maxVideoSize: number;
        maxDocumentSize: number;
        maxProfileImageSize: number;
        maxImagesCount: number;
        maxVideosCount: number;
        maxDocumentsCount: number;
        maxTotalFilesCount: number;
        imageCompression: {
            maxWidth: number;
            maxSizeKB: number;
        };
    };
    redis: {
        host: string;
        port: number;
        password: string | undefined;
        connection: {
            maxRetriesPerRequest: null;
            enableReadyCheck: boolean;
        };
        db: {
            bullmq: number;
            userCache: number;
            tokenBlacklist: number;
            rateLimit: number;
            permissionCache: number;
        };
    };
    pagination: {
        defaultLimit: number;
        maxLimit: number;
    };
    razorpay: {
        keyId: string;
        keySecret: string;
        webhookSecret: string;
    };
    payment: {
        gateway: "razorpay" | "stripe" | "payu" | "cashfree";
    };
    booking: {
        platformFee: number;
        gstPercentage: number;
    };
    location: {
        defaultRadius: number;
        maxRadius: number;
        googleMapsApiKey: string;
    };
    notification: {
        enabled: boolean;
        maxRetries: number;
        whatsapp: {
            enabled: boolean;
        };
        push: {
            enabled: boolean;
        };
    };
    admin: {
        email: string;
    };
    demoAuth: {
        enabled: boolean;
        mobile: string;
        otp: string;
    };
    videoProcessing: {
        concurrency: number;
    };
    meilisearch: {
        enabled: boolean;
        host: string;
        apiKey: string;
        indexingConcurrency: number;
    };
};
//# sourceMappingURL=env.d.ts.map