import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import { config } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PlayAsport Academy API',
      version: '1.0.0',
      description:
        'API documentation for PlayAsport Academy backend built with Node.js, TypeScript, Express, and MongoDB.',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}/api/v1`,
        description: 'Development server',
      },
      {
        url: '/api/v1',
        description: 'Current server (auto-detected host)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    example: 'body.email',
                  },
                  message: {
                    type: 'string',
                    example: 'Email is required',
                  },
                },
              },
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total: {
              type: 'integer',
              example: 100,
              description: 'Total number of records',
            },
            page: {
              type: 'integer',
              example: 1,
              description: 'Current page number',
            },
            limit: {
              type: 'integer',
              example: 10,
              description: 'Number of records per page',
            },
            totalPages: {
              type: 'integer',
              example: 10,
              description: 'Total number of pages',
            },
            hasNextPage: {
              type: 'boolean',
              example: true,
              description: 'Whether there is a next page',
            },
            hasPrevPage: {
              type: 'boolean',
              example: false,
              description: 'Whether there is a previous page',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'f316a86c-2909-4d32-8983-eb225c715bcb',
            },
            firstName: {
              type: 'string',
              example: 'John',
            },
            lastName: {
              type: 'string',
              example: 'Doe',
            },
            email: {
              type: 'string',
              example: 'user@example.com',
            },
            mobile: {
              type: 'string',
              example: '9876543210',
            },
            dob: {
              type: 'string',
              format: 'date',
              example: '2000-01-15',
              nullable: true,
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other'],
              example: 'male',
              nullable: true,
            },
            profileImage: {
              type: 'string',
              format: 'uri',
              example: 'https://bucket.s3.region.amazonaws.com/profile-images/user-id.jpg',
              nullable: true,
            },
            roles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    example: '507f1f77bcf86cd799439011',
                  },
                  name: {
                    type: 'string',
                    example: 'user',
                  },
                  description: {
                    type: 'string',
                    example: 'Regular user',
                    nullable: true,
                  },
                },
              },
              description: 'Array of user roles',
            },
            userType: {
              type: 'string',
              enum: ['student', 'guardian'],
              example: 'student',
              nullable: true,
              description: 'User type (only applies when role includes "user")',
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        UserResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'User registered successfully',
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User',
                },
              },
            },
          },
        },
        UserTokenResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Login successful',
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User',
                },
                accessToken: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  description: 'JWT access token (short-lived, 15 minutes)',
                },
                refreshToken: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  description: 'JWT refresh token. Validity: Web apps (7 days), Mobile apps (90 days). Device-specific tokens are stored and linked to the device.',
                },
              },
            },
          },
        },
        RefreshTokenResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Token refreshed successfully',
            },
            data: {
              type: 'object',
              properties: {
                accessToken: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  description: 'New JWT access token (short-lived, 15 minutes)',
                },
                refreshToken: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  description: 'New JWT refresh token. Validity matches original token: Web apps (7 days), Mobile apps (90 days). Old refresh token is blacklisted.',
                },
              },
            },
          },
        },
        LogoutResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Logged out successfully',
            },
            data: {
              type: 'object',
              nullable: true,
            },
          },
        },
        OtpSendResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'One-time password has been sent.',
            },
            data: {
              type: 'object',
              properties: {
                otp: {
                  type: 'string',
                  example: '111111',
                },
                mode: {
                  type: 'string',
                  enum: ['login', 'register', 'profile_update', 'forgot_password'],
                  example: 'login',
                },
                expiresAt: {
                  type: 'string',
                  format: 'date-time',
                  example: '2025-01-01T12:00:00.000Z',
                },
              },
            },
          },
        },
        OtpVerificationResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'OTP verified successfully',
            },
          },
        },
        DeviceInfo: {
          type: 'object',
          description: 'Optional device information for FCM token registration and device-specific refresh tokens. When provided, refresh tokens are device-specific with longer validity for mobile apps (90 days) vs web apps (7 days).',
          properties: {
            fcmToken: {
              type: 'string',
              example: 'fcm-token-from-firebase-cloud-messaging',
              description: 'Firebase Cloud Messaging token for push notifications',
            },
            deviceType: {
              type: 'string',
              enum: ['web', 'android', 'ios'],
              example: 'android',
              description: 'Type of device (web, android, or ios). Determines refresh token expiry: web (7 days), mobile (90 days).',
            },
            deviceId: {
              type: 'string',
              example: 'unique-device-identifier',
              description: 'Optional unique device identifier',
            },
            deviceName: {
              type: 'string',
              example: 'Samsung Galaxy S21',
              description: 'Optional device name/model',
            },
            appVersion: {
              type: 'string',
              example: '1.0.0',
              description: 'Optional app version',
            },
          },
        },
        AcademyRegisterRequest: {
          type: 'object',
          required: ['firstName', 'email', 'password', 'mobile', 'otp'],
          properties: {
            firstName: {
              type: 'string',
              example: 'John',
            },
            lastName: {
              type: 'string',
              example: 'Doe',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'academy@example.com',
            },
            password: {
              type: 'string',
              minLength: 8,
              example: 'strongPassword123',
            },
            mobile: {
              type: 'string',
              example: '9876543210',
              description: 'Academy administrator mobile number used for OTP verification',
            },
            otp: {
              type: 'string',
              example: '111111',
              description: 'OTP received on mobile via /academy/auth/send-otp (mode: register)',
            },
            fcmToken: {
              type: 'string',
              example: 'fcm-token-from-firebase-cloud-messaging',
              description: 'Optional: Firebase Cloud Messaging token for push notifications',
            },
            deviceType: {
              type: 'string',
              enum: ['web', 'android', 'ios'],
              example: 'android',
              description: 'Optional: Type of device (web, android, or ios)',
            },
            deviceId: {
              type: 'string',
              example: 'unique-device-identifier',
              description: 'Optional: Unique device identifier',
            },
            deviceName: {
              type: 'string',
              example: 'Samsung Galaxy S21',
              description: 'Optional: Device name/model',
            },
            appVersion: {
              type: 'string',
              example: '1.0.0',
              description: 'Optional: App version',
            },
          },
        },
        AcademyRegisterResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Coaching centre registered successfully',
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User',
                },
                accessToken: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  description: 'JWT access token (short-lived, 15 minutes)',
                },
                refreshToken: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  description: 'JWT refresh token. Validity: Web apps (7 days), Mobile apps (90 days). Device-specific tokens are stored and linked to the device.',
                },
              },
            },
          },
        },
        AcademyForgotPasswordRequest: {
          type: 'object',
          required: ['mode'],
          properties: {
            mode: {
              type: 'string',
              enum: ['mobile', 'email'],
              example: 'mobile',
            },
            mobile: {
              type: 'string',
              example: '9876543210',
              description: 'Required when mode is mobile.',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'academy@example.com',
              description: 'Required when mode is email.',
            },
          },
        },
        AcademyForgotPasswordVerify: {
          type: 'object',
          required: ['mode', 'otp', 'newPassword'],
          properties: {
            mode: {
              type: 'string',
              enum: ['mobile', 'email'],
              example: 'mobile',
            },
            mobile: {
              type: 'string',
              example: '9876543210',
              description: 'Required when mode is mobile.',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'academy@example.com',
              description: 'Required when mode is email.',
            },
            otp: {
              type: 'string',
              example: '111111',
            },
            newPassword: {
              type: 'string',
              example: 'StrongPass@123#',
            },
          },
        },
        AcademyLoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'academy@example.com',
            },
            password: {
              type: 'string',
              example: 'strongPassword123',
            },
            fcmToken: {
              type: 'string',
              example: 'fcm-token-from-firebase-cloud-messaging',
              description: 'Optional: Firebase Cloud Messaging token for push notifications',
            },
            deviceType: {
              type: 'string',
              enum: ['web', 'android', 'ios'],
              example: 'android',
              description: 'Optional: Type of device (web, android, or ios)',
            },
            deviceId: {
              type: 'string',
              example: 'unique-device-identifier',
              description: 'Optional: Unique device identifier',
            },
            deviceName: {
              type: 'string',
              example: 'Samsung Galaxy S21',
              description: 'Optional: Device name/model',
            },
            appVersion: {
              type: 'string',
              example: '1.0.0',
              description: 'Optional: App version',
            },
          },
        },
        AcademySocialLoginRequest: {
          type: 'object',
          required: ['idToken'],
          properties: {
            provider: {
              type: 'string',
              enum: ['google', 'facebook', 'instagram', 'apple'],
              example: 'google',
              description: 'Optional hint for analytics/logging. Token verification relies on Firebase.',
            },
            idToken: {
              type: 'string',
              example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjUxOG... (Firebase ID token)',
            },
            firstName: {
              type: 'string',
              example: 'John',
            },
            lastName: {
              type: 'string',
              example: 'Doe',
            },
            fcmToken: {
              type: 'string',
              example: 'fcm-token-from-firebase-cloud-messaging',
              description: 'Optional: Firebase Cloud Messaging token for push notifications',
            },
            deviceType: {
              type: 'string',
              enum: ['web', 'android', 'ios'],
              example: 'android',
              description: 'Optional: Type of device (web, android, or ios)',
            },
            deviceId: {
              type: 'string',
              example: 'unique-device-identifier',
              description: 'Optional: Unique device identifier',
            },
            deviceName: {
              type: 'string',
              example: 'Samsung Galaxy S21',
              description: 'Optional: Device name/model',
            },
            appVersion: {
              type: 'string',
              example: '1.0.0',
              description: 'Optional: App version',
            },
          },
          example: {
            provider: 'google',
            idToken: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjUxOG...',
            firstName: 'John',
            lastName: 'Doe',
            fcmToken: 'fcm-token-from-firebase-cloud-messaging',
            deviceType: 'android',
          },
        },
        AcademyOtpRequest: {
          type: 'object',
          required: ['mobile'],
          properties: {
            mobile: {
              type: 'string',
              example: '9876543210',
            },
            mode: {
              type: 'string',
              enum: ['login', 'register', 'profile_update', 'forgot_password'],
              example: 'register',
              description:
                'Purpose of OTP. Defaults to login when omitted. Use profile_update for mobile change verification, forgot_password for password reset.',
            },
          },
        },
        AcademyVerifyOtpRequest: {
          type: 'object',
          required: ['mobile', 'otp'],
          properties: {
            mobile: {
              type: 'string',
              example: '9876543210',
            },
            otp: {
              type: 'string',
              example: '123456',
            },
            mode: {
              type: 'string',
              enum: ['login', 'register', 'profile_update', 'forgot_password'],
              example: 'login',
            },
            fcmToken: {
              type: 'string',
              example: 'fcm-token-from-firebase-cloud-messaging',
              description: 'Optional: Firebase Cloud Messaging token for push notifications',
            },
            deviceType: {
              type: 'string',
              enum: ['web', 'android', 'ios'],
              example: 'android',
              description: 'Optional: Type of device (web, android, or ios)',
            },
            deviceId: {
              type: 'string',
              example: 'unique-device-identifier',
              description: 'Optional: Unique device identifier',
            },
            deviceName: {
              type: 'string',
              example: 'Samsung Galaxy S21',
              description: 'Optional: Device name/model',
            },
            appVersion: {
              type: 'string',
              example: '1.0.0',
              description: 'Optional: App version',
            },
          },
        },
        AcademyProfileUpdateRequest: {
          type: 'object',
          properties: {
            firstName: {
              type: 'string',
              example: 'John',
            },
            lastName: {
              type: 'string',
              example: 'Doe',
            },
          },
        },
        AcademyAddressUpdateRequest: {
          type: 'object',
          required: ['address'],
          properties: {
            address: {
              type: 'object',
              required: ['line2', 'city', 'state', 'country', 'pincode'],
              properties: {
                line1: { type: 'string', example: '123 Main Street' },
                line2: { type: 'string', example: 'Suite 4B' },
                area: { type: 'string', example: 'Downtown' },
                city: { type: 'string', example: 'New Delhi' },
                state: { type: 'string', example: 'Delhi' },
                country: { type: 'string', example: 'India' },
                pincode: { type: 'string', example: '110001' },
              },
            },
          },
        },
        AcademyPasswordChangeRequest: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: {
              type: 'string',
              example: 'CurrentPass@123',
            },
            newPassword: {
              type: 'string',
              example: 'NewPass@123',
            },
          },
        },
        UserRegisterRequest: {
          type: 'object',
          required: ['firstName', 'email', 'type', 'dob', 'gender'],
          description: 'Register a new user (student or guardian). Password is NOT required - users authenticate via OTP only. Either tempToken or otp is required (not both). When using tempToken, mobile is NOT required as it is extracted from the token for security.',
          properties: {
            firstName: {
              type: 'string',
              example: 'John',
            },
            lastName: {
              type: 'string',
              example: 'Doe',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            mobile: {
              type: 'string',
              example: '9876543210',
              description: 'Mobile number (required only for legacy OTP flow). When using tempToken, mobile is NOT required - it will be extracted from the tempToken for security.',
            },
            type: {
              type: 'string',
              enum: ['student', 'guardian'],
              example: 'student',
              description: 'User type - either student or guardian',
            },
            dob: {
              type: 'string',
              format: 'date',
              example: '2000-01-15',
              description: 'Date of birth in YYYY-MM-DD format. Age must be at least 3 years. For students, minimum age is 13 years.',
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other'],
              example: 'male',
            },
            tempToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              description: 'Temporary registration token received from verify-otp endpoint (valid for 30 minutes). When using tempToken, OTP is NOT required - the tempToken already verifies that OTP was validated. Either tempToken or otp is required, but not both.',
            },
            otp: {
              type: 'string',
              example: '123456',
              description: 'OTP code (legacy support only). Note: If using the new registration flow with tempToken, do NOT provide OTP. Either tempToken or otp is required, but not both.',
            },
            fcmToken: {
              type: 'string',
              example: 'fcm-token-from-firebase-cloud-messaging',
              description: 'Optional: Firebase Cloud Messaging token for push notifications',
            },
            deviceType: {
              type: 'string',
              enum: ['web', 'android', 'ios'],
              example: 'android',
              description: 'Optional: Type of device (web, android, or ios)',
            },
            deviceId: {
              type: 'string',
              example: 'unique-device-identifier',
              description: 'Optional: Unique device identifier',
            },
            deviceName: {
              type: 'string',
              example: 'Samsung Galaxy S21',
              description: 'Optional: Device name/model',
            },
            appVersion: {
              type: 'string',
              example: '1.0.0',
              description: 'Optional: App version',
            },
          },
        },
        UserLoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            password: {
              type: 'string',
              example: 'StrongPass@123',
            },
            fcmToken: {
              type: 'string',
              example: 'fcm-token-from-firebase-cloud-messaging',
              description: 'Optional: Firebase Cloud Messaging token for push notifications',
            },
            deviceType: {
              type: 'string',
              enum: ['web', 'android', 'ios'],
              example: 'android',
              description: 'Optional: Type of device (web, android, or ios)',
            },
            deviceId: {
              type: 'string',
              example: 'unique-device-identifier',
              description: 'Optional: Unique device identifier',
            },
            deviceName: {
              type: 'string',
              example: 'Samsung Galaxy S21',
              description: 'Optional: Device name/model',
            },
            appVersion: {
              type: 'string',
              example: '1.0.0',
              description: 'Optional: App version',
            },
          },
        },
        UserSocialLoginRequest: {
          type: 'object',
          required: ['idToken'],
          properties: {
            provider: {
              type: 'string',
              enum: ['google', 'facebook', 'instagram', 'apple'],
              example: 'google',
              description: 'Optional hint for analytics/logging. Token verification relies on Firebase.',
            },
            idToken: {
              type: 'string',
              example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjUxOG... (Firebase ID token)',
            },
            firstName: {
              type: 'string',
              example: 'John',
            },
            lastName: {
              type: 'string',
              example: 'Doe',
            },
            type: {
              type: 'string',
              enum: ['student', 'guardian'],
              example: 'student',
              description: 'User type - defaults to student if not provided',
            },
            fcmToken: {
              type: 'string',
              example: 'fcm-token-from-firebase-cloud-messaging',
              description: 'Optional: Firebase Cloud Messaging token for push notifications',
            },
            deviceType: {
              type: 'string',
              enum: ['web', 'android', 'ios'],
              example: 'android',
              description: 'Optional: Type of device (web, android, or ios)',
            },
            deviceId: {
              type: 'string',
              example: 'unique-device-identifier',
              description: 'Optional: Unique device identifier',
            },
            deviceName: {
              type: 'string',
              example: 'Samsung Galaxy S21',
              description: 'Optional: Device name/model',
            },
            appVersion: {
              type: 'string',
              example: '1.0.0',
              description: 'Optional: App version',
            },
          },
          example: {
            provider: 'google',
            idToken: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjUxOG...',
            firstName: 'John',
            lastName: 'Doe',
            type: 'student',
            fcmToken: 'fcm-token-from-firebase-cloud-messaging',
            deviceType: 'android',
          },
        },
        UserOtpRequest: {
          type: 'object',
          required: ['mobile'],
          properties: {
            mobile: {
              type: 'string',
              example: '9876543210',
            },
            mode: {
              type: 'string',
              enum: ['login', 'register', 'profile_update', 'forgot_password'],
              example: 'register',
              description:
                'Purpose of OTP. Defaults to login when omitted. Use profile_update for mobile change verification, forgot_password for password reset.',
            },
          },
        },
        UserVerifyOtpRequest: {
          type: 'object',
          required: ['mobile', 'otp'],
          properties: {
            mobile: {
              type: 'string',
              example: '9876543210',
            },
            otp: {
              type: 'string',
              example: '123456',
            },
            mode: {
              type: 'string',
              enum: ['login', 'register', 'profile_update', 'forgot_password'],
              example: 'login',
            },
            fcmToken: {
              type: 'string',
              example: 'fcm-token-from-firebase-cloud-messaging',
              description: 'Optional: Firebase Cloud Messaging token for push notifications',
            },
            deviceType: {
              type: 'string',
              enum: ['web', 'android', 'ios'],
              example: 'android',
              description: 'Optional: Type of device (web, android, or ios)',
            },
            deviceId: {
              type: 'string',
              example: 'unique-device-identifier',
              description: 'Optional: Unique device identifier',
            },
            deviceName: {
              type: 'string',
              example: 'Samsung Galaxy S21',
              description: 'Optional: Device name/model',
            },
            appVersion: {
              type: 'string',
              example: '1.0.0',
              description: 'Optional: App version',
            },
          },
        },
        UserProfileUpdateRequest: {
          type: 'object',
          properties: {
            firstName: {
              type: 'string',
              example: 'John',
            },
            lastName: {
              type: 'string',
              example: 'Doe',
            },
            dob: {
              type: 'string',
              format: 'date',
              example: '2000-01-15',
              description: 'Date of birth in YYYY-MM-DD format',
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other'],
              example: 'male',
            },
          },
        },
        UserAddressUpdateRequest: {
          type: 'object',
          required: ['address'],
          properties: {
            address: {
              type: 'object',
              required: ['line2', 'city', 'state', 'country', 'pincode'],
              properties: {
                line1: { type: 'string', example: '123 Main Street' },
                line2: { type: 'string', example: 'Suite 4B' },
                area: { type: 'string', example: 'Downtown' },
                city: { type: 'string', example: 'New Delhi' },
                state: { type: 'string', example: 'Delhi' },
                country: { type: 'string', example: 'India' },
                pincode: { type: 'string', example: '110001' },
              },
            },
          },
        },
        UserPasswordChangeRequest: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: {
              type: 'string',
              example: 'CurrentPass@123',
            },
            newPassword: {
              type: 'string',
              example: 'NewPass@123',
            },
          },
        },
        UserForgotPasswordRequest: {
          type: 'object',
          required: ['mode'],
          properties: {
            mode: {
              type: 'string',
              enum: ['mobile', 'email'],
              example: 'mobile',
            },
            mobile: {
              type: 'string',
              example: '9876543210',
              description: 'Required when mode is mobile.',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
              description: 'Required when mode is email.',
            },
          },
        },
        UserForgotPasswordVerify: {
          type: 'object',
          required: ['mode', 'otp', 'newPassword'],
          properties: {
            mode: {
              type: 'string',
              enum: ['mobile', 'email'],
              example: 'mobile',
            },
            mobile: {
              type: 'string',
              example: '9876543210',
              description: 'Required when mode is mobile.',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
              description: 'Required when mode is email.',
            },
            otp: {
              type: 'string',
              example: '123456',
            },
            newPassword: {
              type: 'string',
              example: 'StrongPass@123',
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Operation completed successfully',
            },
            data: {
              type: 'object',
              additionalProperties: true,
              example: { mode: 'mobile' },
            },
          },
        },
        S3TestResult: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
              description: 'Overall test result - true if all tests passed',
            },
            tests: {
              type: 'object',
              properties: {
                clientInitialization: {
                  type: 'object',
                  properties: {
                    passed: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'S3 client initialized successfully. Region: us-east-1' },
                  },
                },
                bucketAccess: {
                  type: 'object',
                  properties: {
                    passed: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Bucket "my-bucket" is accessible.' },
                  },
                },
                writePermission: {
                  type: 'object',
                  properties: {
                    passed: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Write permission verified. Test file uploaded: test/test-connection-xxx.txt' },
                    testFileUrl: { type: 'string', format: 'uri', example: 'https://bucket.s3.region.amazonaws.com/test/test-connection-xxx.txt' },
                  },
                },
                readPermission: {
                  type: 'object',
                  properties: {
                    passed: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Read permission verified. Test file content retrieved successfully.' },
                  },
                },
                deletePermission: {
                  type: 'object',
                  properties: {
                    passed: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Delete permission verified. Test file deleted successfully.' },
                  },
                },
              },
            },
            summary: {
              type: 'string',
              example: 'All S3 connection and permission tests passed successfully!',
              description: 'Summary of all test results',
            },
          },
        },
        Country: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            name: { type: 'string', example: 'India' },
            code: { type: 'string', nullable: true, example: 'IN' },
            iso2: { type: 'string', nullable: true, example: 'IN' },
            iso3: { type: 'string', nullable: true, example: 'IND' },
            phoneCode: { type: 'string', nullable: true, example: '+91' },
            currency: { type: 'string', nullable: true, example: 'INR' },
            currencySymbol: { type: 'string', nullable: true, example: '₹' },
            region: { type: 'string', nullable: true, example: 'Asia' },
            subregion: { type: 'string', nullable: true, example: 'Southern Asia' },
            latitude: { type: 'number', nullable: true, example: 20.5937 },
            longitude: { type: 'number', nullable: true, example: 78.9629 },
            createdAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' },
          },
        },
        State: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439012' },
            name: { type: 'string', example: 'Delhi' },
            countryId: { type: 'string', nullable: true, example: '507f1f77bcf86cd799439011' },
            countryCode: { type: 'string', nullable: true, example: 'IN' },
            countryName: { type: 'string', nullable: true, example: 'India' },
            stateCode: { type: 'string', nullable: true, example: 'DL' },
            latitude: { type: 'number', nullable: true, example: 28.6139 },
            longitude: { type: 'number', nullable: true, example: 77.209 },
            createdAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' },
          },
        },
        City: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439013' },
            name: { type: 'string', example: 'New Delhi' },
            stateId: { type: 'string', nullable: true, example: '507f1f77bcf86cd799439012' },
            stateName: { type: 'string', nullable: true, example: 'Delhi' },
            stateCode: { type: 'string', nullable: true, example: 'DL' },
            countryId: { type: 'string', nullable: true, example: '507f1f77bcf86cd799439011' },
            countryCode: { type: 'string', nullable: true, example: 'IN' },
            countryName: { type: 'string', nullable: true, example: 'India' },
            latitude: { type: 'number', nullable: true, example: 28.6139 },
            longitude: { type: 'number', nullable: true, example: 77.209 },
            createdAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' },
          },
        },
        TopCity: {
          type: 'object',
          description: 'Top city with academy and sports counts',
          properties: {
            city: {
              type: 'string',
              example: 'Mumbai',
              description: 'City name',
            },
            state: {
              type: 'string',
              example: 'Maharashtra',
              description: 'State name',
            },
            academyCount: {
              type: 'number',
              example: 45,
              description: 'Number of active academies in the city',
            },
            sportsCount: {
              type: 'number',
              example: 12,
              description: 'Number of unique sports available in the city',
            },
          },
        },
        SportListItem: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
              description: 'MongoDB Object ID',
            },
            custom_id: {
              type: 'string',
              format: 'uuid',
              example: '06da21af-f11c-4cd9-8ecc-b21d3de9ad2c',
              description: 'Unique identifier for the sport',
            },
            name: {
              type: 'string',
              example: 'Cricket',
              description: 'Name of the sport',
            },
            logo: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://bucket.s3.region.amazonaws.com/sports/cricket-logo.png',
              description: 'URL of the sport logo image',
            },
            is_popular: {
              type: 'boolean',
              example: true,
              description: 'Whether the sport is marked as popular',
            },
          },
        },
        FacilityListItem: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
              description: 'MongoDB Object ID',
            },
            custom_id: {
              type: 'string',
              format: 'uuid',
              example: '06da21af-f11c-4cd9-8ecc-b21d3de9ad2c',
              description: 'Unique identifier for the facility',
            },
            name: {
              type: 'string',
              example: 'Swimming Pool',
              description: 'Name of the facility',
            },
            description: {
              type: 'string',
              nullable: true,
              example: 'Olympic size swimming pool with modern facilities',
              description: 'Description of the facility',
            },
            icon: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://bucket.s3.region.amazonaws.com/facilities/swimming-pool-icon.png',
              description: 'URL of the facility icon',
            },
          },
        },
        Facility: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
              description: 'MongoDB Object ID',
            },
            custom_id: {
              type: 'string',
              format: 'uuid',
              example: '06da21af-f11c-4cd9-8ecc-b21d3de9ad2c',
              description: 'Unique identifier for the facility',
            },
            name: {
              type: 'string',
              example: 'Swimming Pool',
              description: 'Name of the facility',
            },
            description: {
              type: 'string',
              nullable: true,
              example: 'Olympic size swimming pool with modern facilities',
              description: 'Description of the facility',
            },
            icon: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://bucket.s3.region.amazonaws.com/facilities/swimming-pool-icon.png',
              description: 'URL of the facility icon',
            },
            is_active: {
              type: 'boolean',
              example: true,
              description: 'Whether the facility is active',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
              description: 'Last update timestamp',
            },
          },
        },
        CreateFacilityRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              example: 'Swimming Pool',
              description: 'Name of the facility (required, max 100 characters)',
            },
            description: {
              type: 'string',
              maxLength: 500,
              nullable: true,
              example: 'Olympic size swimming pool with modern facilities',
              description: 'Description of the facility (optional, max 500 characters)',
            },
            icon: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://example.com/icons/swimming.png',
              description: 'Icon URL for the facility (optional)',
            },
            is_active: {
              type: 'boolean',
              example: true,
              description: 'Whether the facility is active (defaults to true)',
            },
          },
        },
        UpdateFacilityRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              example: 'Updated Swimming Pool',
              description: 'Name of the facility (optional, max 100 characters)',
            },
            description: {
              type: 'string',
              maxLength: 500,
              nullable: true,
              example: 'Updated description',
              description: 'Description of the facility (optional, max 500 characters)',
            },
            icon: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://example.com/icons/swimming-updated.png',
              description: 'Icon URL for the facility (optional)',
            },
            is_active: {
              type: 'boolean',
              example: true,
              description: 'Whether the facility is active (optional)',
            },
          },
        },
        CreateCountryRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 200,
              example: 'India',
              description: 'Country name (required)',
            },
            code: {
              type: 'string',
              maxLength: 10,
              nullable: true,
              example: 'IN',
              description: 'Country code (optional)',
            },
            iso2: {
              type: 'string',
              minLength: 2,
              maxLength: 2,
              nullable: true,
              example: 'IN',
              description: 'ISO 3166-1 alpha-2 code (optional)',
            },
            iso3: {
              type: 'string',
              minLength: 3,
              maxLength: 3,
              nullable: true,
              example: 'IND',
              description: 'ISO 3166-1 alpha-3 code (optional)',
            },
            phoneCode: {
              type: 'string',
              maxLength: 10,
              nullable: true,
              example: '+91',
              description: 'Phone country code (optional)',
            },
            currency: {
              type: 'string',
              maxLength: 10,
              nullable: true,
              example: 'INR',
              description: 'Currency code (optional)',
            },
            currencySymbol: {
              type: 'string',
              maxLength: 10,
              nullable: true,
              example: '₹',
              description: 'Currency symbol (optional)',
            },
            region: {
              type: 'string',
              maxLength: 100,
              nullable: true,
              example: 'Asia',
              description: 'Geographic region (optional)',
            },
            subregion: {
              type: 'string',
              maxLength: 100,
              nullable: true,
              example: 'Southern Asia',
              description: 'Geographic subregion (optional)',
            },
            latitude: {
              type: 'number',
              minimum: -90,
              maximum: 90,
              nullable: true,
              example: 20.5937,
              description: 'Latitude coordinate (optional)',
            },
            longitude: {
              type: 'number',
              minimum: -180,
              maximum: 180,
              nullable: true,
              example: 78.9629,
              description: 'Longitude coordinate (optional)',
            },
          },
        },
        UpdateCountryRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 200,
              example: 'India',
              description: 'Country name (optional)',
            },
            code: {
              type: 'string',
              maxLength: 10,
              nullable: true,
              example: 'IN',
              description: 'Country code (optional)',
            },
            iso2: {
              type: 'string',
              minLength: 2,
              maxLength: 2,
              nullable: true,
              example: 'IN',
              description: 'ISO 3166-1 alpha-2 code (optional)',
            },
            iso3: {
              type: 'string',
              minLength: 3,
              maxLength: 3,
              nullable: true,
              example: 'IND',
              description: 'ISO 3166-1 alpha-3 code (optional)',
            },
            phoneCode: {
              type: 'string',
              maxLength: 10,
              nullable: true,
              example: '+91',
              description: 'Phone country code (optional)',
            },
            currency: {
              type: 'string',
              maxLength: 10,
              nullable: true,
              example: 'INR',
              description: 'Currency code (optional)',
            },
            currencySymbol: {
              type: 'string',
              maxLength: 10,
              nullable: true,
              example: '₹',
              description: 'Currency symbol (optional)',
            },
            region: {
              type: 'string',
              maxLength: 100,
              nullable: true,
              example: 'Asia',
              description: 'Geographic region (optional)',
            },
            subregion: {
              type: 'string',
              maxLength: 100,
              nullable: true,
              example: 'Southern Asia',
              description: 'Geographic subregion (optional)',
            },
            latitude: {
              type: 'number',
              minimum: -90,
              maximum: 90,
              nullable: true,
              example: 20.5937,
              description: 'Latitude coordinate (optional)',
            },
            longitude: {
              type: 'number',
              minimum: -180,
              maximum: 180,
              nullable: true,
              example: 78.9629,
              description: 'Longitude coordinate (optional)',
            },
          },
        },
        CreateStateRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 200,
              example: 'Delhi',
              description: 'State name (required)',
            },
            countryId: {
              type: 'string',
              minLength: 1,
              example: '507f1f77bcf86cd799439011',
              description: 'Country ID (required if countryCode not provided)',
            },
            countryCode: {
              type: 'string',
              minLength: 1,
              example: 'IN',
              description: 'Country code (required if countryId not provided)',
            },
            stateCode: {
              type: 'string',
              maxLength: 10,
              nullable: true,
              example: 'DL',
              description: 'State code (optional)',
            },
            latitude: {
              type: 'number',
              minimum: -90,
              maximum: 90,
              nullable: true,
              example: 28.6139,
              description: 'Latitude coordinate (optional)',
            },
            longitude: {
              type: 'number',
              minimum: -180,
              maximum: 180,
              nullable: true,
              example: 77.209,
              description: 'Longitude coordinate (optional)',
            },
          },
        },
        UpdateStateRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 200,
              example: 'Delhi',
              description: 'State name (optional)',
            },
            countryId: {
              type: 'string',
              minLength: 1,
              example: '507f1f77bcf86cd799439011',
              description: 'Country ID (optional)',
            },
            countryCode: {
              type: 'string',
              minLength: 1,
              example: 'IN',
              description: 'Country code (optional)',
            },
            stateCode: {
              type: 'string',
              maxLength: 10,
              nullable: true,
              example: 'DL',
              description: 'State code (optional)',
            },
            latitude: {
              type: 'number',
              minimum: -90,
              maximum: 90,
              nullable: true,
              example: 28.6139,
              description: 'Latitude coordinate (optional)',
            },
            longitude: {
              type: 'number',
              minimum: -180,
              maximum: 180,
              nullable: true,
              example: 77.209,
              description: 'Longitude coordinate (optional)',
            },
          },
        },
        CreateCityRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 200,
              example: 'New Delhi',
              description: 'City name (required)',
            },
            stateId: {
              type: 'string',
              minLength: 1,
              example: '507f1f77bcf86cd799439011',
              description: 'State ID (required if stateName not provided)',
            },
            stateName: {
              type: 'string',
              minLength: 1,
              example: 'Delhi',
              description: 'State name (required if stateId not provided)',
            },
            latitude: {
              type: 'number',
              minimum: -90,
              maximum: 90,
              nullable: true,
              example: 28.6139,
              description: 'Latitude coordinate (optional)',
            },
            longitude: {
              type: 'number',
              minimum: -180,
              maximum: 180,
              nullable: true,
              example: 77.209,
              description: 'Longitude coordinate (optional)',
            },
          },
        },
        UpdateCityRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 200,
              example: 'New Delhi',
              description: 'City name (optional)',
            },
            stateId: {
              type: 'string',
              minLength: 1,
              example: '507f1f77bcf86cd799439011',
              description: 'State ID (optional)',
            },
            stateName: {
              type: 'string',
              minLength: 1,
              example: 'Delhi',
              description: 'State name (optional)',
            },
            latitude: {
              type: 'number',
              minimum: -90,
              maximum: 90,
              nullable: true,
              example: 28.6139,
              description: 'Latitude coordinate (optional)',
            },
            longitude: {
              type: 'number',
              minimum: -180,
              maximum: 180,
              nullable: true,
              example: 77.209,
              description: 'Longitude coordinate (optional)',
            },
          },
        },
        ReelListItem: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: 'a9e7fb78-085a-4cbc-993c-9784f8f6576a',
              description: 'Unique identifier for the reel',
            },
            videoUrl: {
              type: 'string',
              format: 'uri',
              example: 'https://media-playsport.s3.ap-south-1.amazonaws.com/reels/179/1755696149_C60rlU4My8/master.m3u8',
              description: 'URL to the master M3U8 video file',
            },
            thumbnailUrl: {
              type: 'string',
              format: 'uri',
              example: 'https://media-playsport.s3.ap-south-1.amazonaws.com/reels/179/1755696149_C60rlU4My8/thumbnail.jpg',
              description: 'URL to the thumbnail image',
            },
            title: {
              type: 'string',
              example: 'Line up. Aim. Break. 🎱🔥 #PlayASports #8BallDreams',
              description: 'Title of the reel',
            },
            description: {
              type: 'string',
              nullable: true,
              example: '8-Ball Pool is not just about hitting balls. It is about focus, strategy, and precision.',
              description: 'Description of the reel',
            },
            share_url: {
              type: 'string',
              format: 'uri',
              example: 'https://playasport.in/reels/a9e7fb78-085a-4cbc-993c-9784f8f6576a',
              description: 'Shareable URL for the reel',
            },
            user: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  example: 'Play A Sport',
                  description: 'Name of the user who created the reel',
                },
                avatar: {
                  type: 'string',
                  format: 'uri',
                  nullable: true,
                  example: 'https://media-playsport.s3.ap-south-1.amazonaws.com/users/profile_photo/wUkolRoiaTFm5EdcmY3oUKrdsXL5pNjFa4syyJ7O.png',
                  description: 'URL to the user profile avatar',
                },
              },
            },
            likes: {
              type: 'integer',
              example: 0,
              description: 'Number of likes',
            },
            views: {
              type: 'integer',
              example: 203,
              description: 'Number of views',
            },
            comments: {
              type: 'integer',
              example: 0,
              description: 'Number of comments',
            },
          },
        },
        PopularReel: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '941aef58-df50-493b-9ac6-54be6dd0051d',
              description: 'Unique identifier for the reel',
            },
            videoUrl: {
              type: 'string',
              format: 'uri',
              example: 'https://media-playsport.s3.ap-south-1.amazonaws.com/reels/179/1751522791_OnjKxHFcdo/master.m3u8',
              description: 'URL to the master M3U8 video file',
            },
            videoPreviewUrl: {
              type: 'string',
              format: 'uri',
              example: 'https://media-playsport.s3.ap-south-1.amazonaws.com/reels/179/1751522791_OnjKxHFcdo/preview.mp4',
              description: 'URL to the preview video file',
            },
            thumbnailUrl: {
              type: 'string',
              format: 'uri',
              example: 'https://media-playsport.s3.ap-south-1.amazonaws.com/reels/179/1751522791_OnjKxHFcdo/thumbnail.jpg',
              description: 'URL to the thumbnail image',
            },
            title: {
              type: 'string',
              example: 'Badminton boosts physical fitness',
              description: 'Title of the reel',
            },
            description: {
              type: 'string',
              nullable: true,
              example: 'Badminton boosts physical fitness, sharpens reflexes, and enhances strategic thinking.',
              description: 'Description of the reel',
            },
            user: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  example: 'Play A Sport',
                  description: 'Name of the user who created the reel',
                },
                avatar: {
                  type: 'string',
                  format: 'uri',
                  nullable: true,
                  example: 'https://media-playsport.s3.ap-south-1.amazonaws.com/users/profile_photo/wUkolRoiaTFm5EdcmY3oUKrdsXL5pNjFa4syyJ7O.png',
                  description: 'URL to the user profile avatar',
                },
              },
            },
            likes: {
              type: 'integer',
              example: 0,
              description: 'Number of likes',
            },
            views: {
              type: 'integer',
              example: 663,
              description: 'Number of views',
            },
            comments: {
              type: 'integer',
              example: 0,
              description: 'Number of comments',
            },
          },
        },
        ReelsListResponse: {
          type: 'object',
          properties: {
            reels: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ReelListItem',
              },
            },
            total: {
              type: 'integer',
              example: 10,
              description: 'Total number of reels',
            },
            current_page: {
              type: 'integer',
              example: 1,
              description: 'Current page number',
            },
            total_pages: {
              type: 'integer',
              example: 4,
              description: 'Total number of pages',
            },
            limit: {
              type: 'integer',
              example: 3,
              description: 'Number of reels per page',
            },
          },
        },
        StreamHighlight: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: 'a9e7fb78-085a-4cbc-993c-9784f8f6576a',
              description: 'Unique identifier for the highlight',
            },
            title: {
              type: 'string',
              maxLength: 60,
              example: 'Rajib Soccer Academy Highlights',
              description: 'Title of the highlight (max 60 characters)',
            },
            description: {
              type: 'string',
              nullable: true,
              example: 'Rajib Soccer Academy is committed to developing young football talent...',
              description: 'Description of the highlight',
            },
            videoUrl: {
              type: 'string',
              format: 'uri',
              example: 'https://bucket.s3.region.amazonaws.com/highlights/video.mp4',
              description: 'URL to the highlight video',
            },
            thumbnailUrl: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://bucket.s3.region.amazonaws.com/highlights/thumbnail.jpg',
              description: 'URL to the thumbnail image',
            },
            hlsUrls: {
              type: 'object',
              nullable: true,
              additionalProperties: {
                type: 'string',
                format: 'uri',
              },
              example: {
                '360p': 'https://bucket.s3.region.amazonaws.com/highlights/360p.m3u8',
                '480p': 'https://bucket.s3.region.amazonaws.com/highlights/480p.m3u8',
                '720p': 'https://bucket.s3.region.amazonaws.com/highlights/720p.m3u8',
                '1080p': 'https://bucket.s3.region.amazonaws.com/highlights/1080p.m3u8',
              },
              description: 'HLS video URLs for different resolutions',
            },
            masterM3u8Url: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://bucket.s3.region.amazonaws.com/highlights/master.m3u8',
              description: 'Master M3U8 playlist URL',
            },
            previewUrl: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://bucket.s3.region.amazonaws.com/highlights/preview.mp4',
              description: 'Preview video URL',
            },
            duration: {
              type: 'number',
              example: 3600,
              description: 'Duration in seconds',
            },
            viewsCount: {
              type: 'integer',
              example: 757,
              description: 'Number of views',
            },
            likesCount: {
              type: 'integer',
              example: 0,
              description: 'Number of likes',
            },
            commentsCount: {
              type: 'integer',
              example: 0,
              description: 'Number of comments',
            },
            status: {
              type: 'string',
              enum: ['published', 'archived', 'blocked', 'deleted'],
              example: 'published',
              description: 'Status of the highlight',
            },
            videoProcessingStatus: {
              type: 'string',
              enum: ['not_started', 'processing', 'completed', 'failed'],
              example: 'not_started',
              description: 'Video processing job status',
            },
            userId: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
              description: 'User ID (MongoDB ObjectId) who created the highlight',
            },
            coachingCenterId: {
              type: 'string',
              nullable: true,
              example: '507f1f77bcf86cd799439012',
              description: 'Coaching center ID (MongoDB ObjectId, optional)',
            },
            publishedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2024-01-15T10:30:00.000Z',
              description: 'Timestamp when highlight was published',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:00:00.000Z',
              description: 'Timestamp when highlight was created',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z',
              description: 'Timestamp when highlight was last updated',
            },
          },
        },
        AdminCoachingCenterCreateRequest: {
          type: 'object',
          required: [
            'center_name',
            'mobile_number',
            'email',
            'sports',
            'sport_details',
            'age',
            'location',
            'operational_timing',
            'allowed_genders',
            'allowed_disabled',
            'is_only_for_disabled',
            'experience',
            'academy_owner',
          ],
          properties: {
            academy_owner: {
              type: 'object',
              required: ['firstName', 'email', 'mobile'],
              properties: {
                firstName: { type: 'string', example: 'Academy Owner' },
                lastName: { type: 'string', example: 'Name' },
                email: { type: 'string', format: 'email', example: 'academy@example.com' },
                mobile: { type: 'string', example: '9876543210' },
              },
              description: 'Academy owner details. A new user with role "academy" will be created if email/mobile doesn\'t exist.',
            },
            center_name: {
              type: 'string',
              example: 'Elite Sports Academy',
              description: 'Name of the coaching center',
            },
            mobile_number: {
              type: 'string',
              example: '9876543210',
              description: 'Mobile number (10 digits, starting with 6-9)',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'info@elitesportsacademy.com',
              description: 'Email address',
            },
            rules_regulation: {
              type: 'array',
              items: {
                type: 'string',
                maxLength: 500,
              },
              example: ['All students must wear proper sports attire', 'Punctuality is mandatory', 'Regular attendance is required'],
              description: 'Rules and regulations (array of strings)',
            },
            logo: {
              type: 'string',
              format: 'uri',
              example: 'https://bucket.s3.region.amazonaws.com/logos/elite-academy.png',
              description: 'Logo URL',
            },
            sports: {
              type: 'array',
              items: {
                type: 'string',
                description: 'Sport ObjectId',
              },
              example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
              description: 'Array of sport IDs (for quick reference/search)',
            },
            sport_details: {
              type: 'array',
              items: {
                type: 'object',
                required: ['sport_id', 'description'],
                properties: {
                  sport_id: {
                    type: 'string',
                    example: '507f1f77bcf86cd799439011',
                    description: 'Sport ObjectId (must be in sports array)',
                  },
                  description: {
                    type: 'string',
                    minLength: 5,
                    maxLength: 2000,
                    example: 'Professional cricket coaching with international level facilities. Our coaches have played at state and national levels.',
                    description: 'Sport-specific description (min 5 characters)',
                  },
                  images: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        unique_id: { type: 'string', example: 'aeddb4dc-35e7-4b86-b08a-03f93a487a4b' },
                        url: { type: 'string', format: 'uri', example: 'https://bucket.s3.region.amazonaws.com/images/coachingCentres/cricket1.jpg' },
                        is_active: { type: 'boolean', default: true },
                        is_deleted: { type: 'boolean', default: false },
                      },
                    },
                    description: 'Sport-specific images',
                  },
                  videos: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        unique_id: { type: 'string', example: 'c3g4d6ef-57g9-6d08-d20c-25h15c609c6d' },
                        url: { type: 'string', format: 'uri', example: 'https://bucket.s3.region.amazonaws.com/videos/coachingCentres/cricket-training.mp4' },
                        thumbnail: { 
                          type: 'string', 
                          format: 'uri', 
                          example: 'https://bucket.s3.region.amazonaws.com/videos/coachingCentres/cricket-training_thumb.jpg',
                          description: 'Video thumbnail URL (auto-generated if not provided)',
                          nullable: true,
                        },
                        is_active: { type: 'boolean', default: true },
                        is_deleted: { type: 'boolean', default: false },
                      },
                    },
                    description: 'Sport-specific videos (thumbnail auto-generated if not provided)',
                  },
                },
              },
              description: 'Sport-specific data (description, images, videos). Each sport in sports array should have corresponding entry here.',
            },
            age: {
              type: 'object',
              required: ['min', 'max'],
              properties: {
                min: {
                  type: 'number',
                  example: 5,
                  description: 'Minimum age',
                },
                max: {
                  type: 'number',
                  example: 18,
                  description: 'Maximum age',
                },
              },
            },
            location: {
              type: 'object',
              required: ['latitude', 'longitude', 'address'],
              properties: {
                latitude: {
                  type: 'number',
                  example: 28.6139,
                  description: 'Latitude coordinate',
                },
                longitude: {
                  type: 'number',
                  example: 77.209,
                  description: 'Longitude coordinate',
                },
                address: {
                  type: 'object',
                  required: ['line1', 'line2', 'city', 'state', 'country', 'pincode'],
                  properties: {
                    line1: {
                      type: 'string',
                      example: '123 Sports Complex',
                    },
                    line2: {
                      type: 'string',
                      example: 'Near Metro Station',
                    },
                    city: {
                      type: 'string',
                      example: 'New Delhi',
                    },
                    state: {
                      type: 'string',
                      example: 'Delhi',
                    },
                    country: {
                      type: 'string',
                      example: 'India',
                    },
                    pincode: {
                      type: 'string',
                      example: '110001',
                    },
                  },
                },
              },
            },
            facility: {
              oneOf: [
                {
                  type: 'string',
                  example: '507f1f77bcf86cd799439011',
                  description: 'Facility ID (if facility already exists)',
                },
                {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      example: 'Swimming Pool',
                      description: 'Facility name (required)',
                    },
                    description: {
                      type: 'string',
                      example: 'Olympic size swimming pool',
                      description: 'Facility description (optional)',
                    },
                    icon: {
                      type: 'string',
                      format: 'uri',
                      example: 'https://example.com/icons/swimming.png',
                      description: 'Facility icon URL (optional)',
                    },
                  },
                  required: ['name'],
                  description: 'Facility object (if creating new facility)',
                },
              ],
              description: 'Facility ID (string) or Facility object (name, description, icon). If object is provided and facility with same name exists, existing facility ID will be used. Otherwise, new facility will be created.',
            },
            operational_timing: {
              type: 'object',
              required: ['operating_days', 'opening_time', 'closing_time'],
              properties: {
                operating_days: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
                  },
                  example: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                  description: 'Days of operation',
                },
                opening_time: {
                  type: 'string',
                  example: '09:00',
                  pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$',
                  description: 'Opening time in HH:MM format',
                },
                closing_time: {
                  type: 'string',
                  example: '18:00',
                  pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$',
                  description: 'Closing time in HH:MM format',
                },
              },
            },
            documents: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  unique_id: { type: 'string', example: 'h8l9i1jk-02l4-1i53-i75h-70m60h154h1i' },
                  url: { type: 'string', format: 'uri', example: 'https://bucket.s3.region.amazonaws.com/documents/coachingCentres/certificate.pdf' },
                  is_active: { type: 'boolean', default: true },
                  is_deleted: { type: 'boolean', default: false },
                },
              },
              description: 'General documents (not sport-specific). Sport-specific images and videos are in sport_details.',
            },
            status: {
              type: 'string',
              enum: ['published'],
              default: 'published',
              example: 'published',
              description: 'Status of the coaching center (Always published for admin)',
            },
            allowed_genders: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['male', 'female', 'other'],
              },
              minItems: 1,
              example: ['male', 'female'],
              description: 'Array of allowed genders for the coaching center (required, at least one gender must be selected)',
            },
            allowed_disabled: {
              type: 'boolean',
              example: false,
              description: 'Whether disabled students are allowed (required)',
            },
            is_only_for_disabled: {
              type: 'boolean',
              example: false,
              description: 'Whether the coaching center is exclusively for disabled students (required)',
            },
            experience: {
              type: 'number',
              minimum: 0,
              example: 5,
              description: 'Number of years of experience (required, must be a non-negative integer)',
            },
          },
        },
        AdminCoachingCenterUpdateRequest: {
          type: 'object',
          required: [
            'allowed_genders',
            'allowed_disabled',
            'is_only_for_disabled',
            'experience',
          ],
          description: 'Update coaching center request for admin. Banking information is removed as it is not inserted by admin.',
          properties: {
            userId: {
              type: 'string',
              description: 'ID of the academy user who owns this center. Only admins can provide this to change owner.',
              example: 'f316a86c-2909-4d32-8983-eb225c715bcb',
            },
            center_name: {
              type: 'string',
              maxLength: 255,
              example: 'Elite Sports Academy',
              description: 'Name of the coaching center',
            },
            mobile_number: {
              type: 'string',
              pattern: '^[6-9]\\d{9}$',
              example: '9876543210',
              description: 'Mobile number (10 digits, starting with 6-9).',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'info@elitesportsacademy.com',
              description: 'Email address.',
            },
            rules_regulation: {
              type: 'array',
              items: {
                type: 'string',
                maxLength: 500,
              },
              nullable: true,
              example: ['All students must wear proper sports attire', 'Punctuality is mandatory'],
              description: 'Rules and regulations (array of strings)',
            },
            logo: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://bucket.s3.region.amazonaws.com/logos/elite-academy.png',
              description: 'Logo URL.',
            },
            sports: {
              type: 'array',
              items: {
                type: 'string',
                description: 'Sport ObjectId',
              },
              example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
              description: 'Array of sport IDs (for quick reference/search).',
            },
            sport_details: {
              type: 'array',
              items: {
                type: 'object',
                required: ['sport_id', 'description'],
                properties: {
                  sport_id: {
                    type: 'string',
                    example: '507f1f77bcf86cd799439011',
                    description: 'Sport ObjectId (must be in sports array)',
                  },
                  description: {
                    type: 'string',
                    minLength: 5,
                    maxLength: 2000,
                    example: 'Professional cricket coaching with international level facilities.',
                    description: 'Sport-specific description (min 5 characters)',
                  },
                  images: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        unique_id: { type: 'string', example: 'aeddb4dc-35e7-4b86-b08a-03f93a487a4b' },
                        url: { type: 'string', format: 'uri', example: 'https://bucket.s3.region.amazonaws.com/images/coachingCentres/cricket1.jpg' },
                        is_active: { type: 'boolean', default: true },
                        is_deleted: { type: 'boolean', default: false },
                      },
                    },
                    description: 'Sport-specific images',
                  },
                  videos: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        unique_id: { type: 'string', example: 'c3g4d6ef-57g9-6d08-d20c-25h15c609c6d' },
                        url: { type: 'string', format: 'uri', example: 'https://bucket.s3.region.amazonaws.com/videos/coachingCentres/cricket-training.mp4' },
                        thumbnail: { 
                          type: 'string', 
                          format: 'uri', 
                          example: 'https://bucket.s3.region.amazonaws.com/videos/coachingCentres/cricket-training_thumb.jpg',
                          description: 'Video thumbnail URL (auto-generated if not provided)',
                          nullable: true,
                        },
                        is_active: { type: 'boolean', default: true },
                        is_deleted: { type: 'boolean', default: false },
                      },
                    },
                    description: 'Sport-specific videos (thumbnail auto-generated if not provided)',
                  },
                },
              },
              description: 'Sport-specific data (description, images, videos).',
            },
            age: {
              type: 'object',
              properties: {
                min: { type: 'number', example: 5 },
                max: { type: 'number', example: 18 },
              },
              description: 'Age range.',
            },
            location: {
              type: 'object',
              properties: {
                latitude: { type: 'number', example: 28.6139 },
                longitude: { type: 'number', example: 77.209 },
                address: {
                  type: 'object',
                  properties: {
                    line1: { type: 'string' },
                    line2: { type: 'string', example: 'Near Metro' },
                    city: { type: 'string', example: 'New Delhi' },
                    state: { type: 'string', example: 'Delhi' },
                    country: { type: 'string', example: 'India' },
                    pincode: { type: 'string', example: '110001' },
                  },
                },
              },
              description: 'Location details.',
            },
            facility: {
              type: 'array',
              items: {
                oneOf: [
                  { type: 'string', description: 'Facility ID' },
                  { 
                    type: 'object',
                    properties: { name: { type: 'string' } }
                  }
                ]
              },
              description: 'Array of facility IDs or objects',
            },
            operational_timing: {
              type: 'object',
              properties: {
                operating_days: { type: 'array', items: { type: 'string' } },
                opening_time: { type: 'string' },
                closing_time: { type: 'string' },
              },
              description: 'Operational timing.',
            },
            documents: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  unique_id: { type: 'string', example: 'h8l9i1jk-02l4-1i53-i75h-70m60h154h1i' },
                  url: { type: 'string', format: 'uri', example: 'https://bucket.s3.region.amazonaws.com/documents/coachingCentres/certificate.pdf' },
                  is_active: { type: 'boolean', default: true },
                  is_deleted: { type: 'boolean', default: false },
                },
              },
              description: 'General documents (not sport-specific)',
            },
            status: {
              type: 'string',
              enum: ['published'],
              example: 'published',
              description: 'Status of the coaching center. Always published for admin.',
            },
            allowed_genders: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['male', 'female', 'other'],
              },
              minItems: 1,
              example: ['male', 'female'],
              description: 'Array of allowed genders for the coaching center',
            },
            allowed_disabled: {
              type: 'boolean',
              example: false,
              description: 'Whether disabled students are allowed',
            },
            is_only_for_disabled: {
              type: 'boolean',
              example: false,
              description: 'Whether the coaching center is exclusively for disabled students',
            },
            experience: {
              type: 'number',
              minimum: 0,
              example: 5,
              description: 'Number of years of experience',
            },
          },
        },
        CoachingCenterCreateRequest: {
          type: 'object',
          required: [
            'center_name',
            'mobile_number',
            'email',
            'sports',
            'sport_details',
            'age',
            'location',
            'operational_timing',
            'bank_information',
            'allowed_genders',
            'allowed_disabled',
            'is_only_for_disabled',
            'experience',
          ],
          properties: {
            userId: {
              type: 'string',
              description: 'ID of the academy user who owns this center. Only admins can provide this to create center for others.',
              example: 'f316a86c-2909-4d32-8983-eb225c715bcb',
            },
            center_name: {
              type: 'string',
              example: 'Elite Sports Academy',
              description: 'Name of the coaching center',
            },
            mobile_number: {
              type: 'string',
              example: '9876543210',
              description: 'Mobile number (10 digits, starting with 6-9)',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'info@elitesportsacademy.com',
              description: 'Email address',
            },
            rules_regulation: {
              type: 'array',
              items: {
                type: 'string',
                maxLength: 500,
              },
              example: ['All students must wear proper sports attire', 'Punctuality is mandatory', 'Regular attendance is required'],
              description: 'Rules and regulations (array of strings)',
            },
            logo: {
              type: 'string',
              format: 'uri',
              example: 'https://bucket.s3.region.amazonaws.com/logos/elite-academy.png',
              description: 'Logo URL',
            },
            sports: {
              type: 'array',
              items: {
                type: 'string',
                description: 'Sport ObjectId',
              },
              example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
              description: 'Array of sport IDs (for quick reference/search)',
            },
            sport_details: {
              type: 'array',
              items: {
                type: 'object',
                required: ['sport_id', 'description'],
                properties: {
                  sport_id: {
                    type: 'string',
                    example: '507f1f77bcf86cd799439011',
                    description: 'Sport ObjectId (must be in sports array)',
                  },
                  description: {
                    type: 'string',
                    minLength: 5,
                    maxLength: 2000,
                    example: 'Professional cricket coaching with international level facilities. Our coaches have played at state and national levels.',
                    description: 'Sport-specific description (min 5 characters)',
                  },
                  images: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        unique_id: { type: 'string', example: 'aeddb4dc-35e7-4b86-b08a-03f93a487a4b' },
                        url: { type: 'string', format: 'uri', example: 'https://bucket.s3.region.amazonaws.com/images/coachingCentres/cricket1.jpg' },
                        is_active: { type: 'boolean', default: true },
                        is_deleted: { type: 'boolean', default: false },
                      },
                    },
                    description: 'Sport-specific images',
                  },
                  videos: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        unique_id: { type: 'string', example: 'c3g4d6ef-57g9-6d08-d20c-25h15c609c6d' },
                        url: { type: 'string', format: 'uri', example: 'https://bucket.s3.region.amazonaws.com/videos/coachingCentres/cricket-training.mp4' },
                        thumbnail: { 
                          type: 'string', 
                          format: 'uri', 
                          example: 'https://bucket.s3.region.amazonaws.com/videos/coachingCentres/cricket-training_thumb.jpg',
                          description: 'Video thumbnail URL (auto-generated if not provided)',
                          nullable: true,
                        },
                        is_active: { type: 'boolean', default: true },
                        is_deleted: { type: 'boolean', default: false },
                      },
                    },
                    description: 'Sport-specific videos (thumbnail auto-generated if not provided)',
                  },
                },
              },
              description: 'Sport-specific data (description, images, videos). Each sport in sports array should have corresponding entry here.',
            },
            age: {
              type: 'object',
              required: ['min', 'max'],
              properties: {
                min: {
                  type: 'number',
                  example: 5,
                  description: 'Minimum age',
                },
                max: {
                  type: 'number',
                  example: 18,
                  description: 'Maximum age',
                },
              },
            },
            location: {
              type: 'object',
              required: ['latitude', 'longitude', 'address'],
              properties: {
                latitude: {
                  type: 'number',
                  example: 28.6139,
                  description: 'Latitude coordinate',
                },
                longitude: {
                  type: 'number',
                  example: 77.209,
                  description: 'Longitude coordinate',
                },
                address: {
                  type: 'object',
                  required: ['line1', 'line2', 'city', 'state', 'country', 'pincode'],
                  properties: {
                    line1: {
                      type: 'string',
                      example: '123 Sports Complex',
                    },
                    line2: {
                      type: 'string',
                      example: 'Near Metro Station',
                    },
                    city: {
                      type: 'string',
                      example: 'New Delhi',
                    },
                    state: {
                      type: 'string',
                      example: 'Delhi',
                    },
                    country: {
                      type: 'string',
                      example: 'India',
                    },
                    pincode: {
                      type: 'string',
                      example: '110001',
                    },
                  },
                },
              },
            },
            facility: {
              oneOf: [
                {
                  type: 'string',
                  example: '507f1f77bcf86cd799439011',
                  description: 'Facility ID (if facility already exists)',
                },
                {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      example: 'Swimming Pool',
                      description: 'Facility name (required)',
                    },
                    description: {
                      type: 'string',
                      example: 'Olympic size swimming pool',
                      description: 'Facility description (optional)',
                    },
                    icon: {
                      type: 'string',
                      format: 'uri',
                      example: 'https://example.com/icons/swimming.png',
                      description: 'Facility icon URL (optional)',
                    },
                  },
                  required: ['name'],
                  description: 'Facility object (if creating new facility)',
                },
              ],
              description: 'Facility ID (string) or Facility object (name, description, icon). If object is provided and facility with same name exists, existing facility ID will be used. Otherwise, new facility will be created.',
            },
            operational_timing: {
              type: 'object',
              required: ['operating_days', 'opening_time', 'closing_time'],
              properties: {
                operating_days: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
                  },
                  example: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                  description: 'Days of operation',
                },
                opening_time: {
                  type: 'string',
                  example: '09:00',
                  pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$',
                  description: 'Opening time in HH:MM format',
                },
                closing_time: {
                  type: 'string',
                  example: '18:00',
                  pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$',
                  description: 'Closing time in HH:MM format',
                },
              },
            },
            documents: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  unique_id: { type: 'string', example: 'h8l9i1jk-02l4-1i53-i75h-70m60h154h1i' },
                  url: { type: 'string', format: 'uri', example: 'https://bucket.s3.region.amazonaws.com/documents/coachingCentres/certificate.pdf' },
                  is_active: { type: 'boolean', default: true },
                  is_deleted: { type: 'boolean', default: false },
                },
              },
              description: 'General documents (not sport-specific). Sport-specific images and videos are in sport_details.',
            },
            bank_information: {
              type: 'object',
              required: ['bank_name', 'account_number', 'ifsc_code', 'account_holder_name'],
              properties: {
                bank_name: {
                  type: 'string',
                  example: 'State Bank of India',
                },
                account_number: {
                  type: 'string',
                  example: '1234567890123456',
                },
                ifsc_code: {
                  type: 'string',
                  example: 'SBIN0001234',
                },
                account_holder_name: {
                  type: 'string',
                  example: 'Elite Sports Academy',
                },
                gst_number: {
                  type: 'string',
                  example: '07AABCU9603R1ZX',
                  description: 'GST number (optional)',
                },
              },
            },
            status: {
              type: 'string',
              enum: ['draft', 'published'],
              default: 'draft',
              example: 'draft',
              description: 'Status of the coaching center (draft or published)',
            },
            allowed_genders: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['male', 'female', 'other'],
              },
              minItems: 1,
              example: ['male', 'female'],
              description: 'Array of allowed genders for the coaching center (required, at least one gender must be selected)',
            },
            allowed_disabled: {
              type: 'boolean',
              example: false,
              description: 'Whether disabled students are allowed (required)',
            },
            is_only_for_disabled: {
              type: 'boolean',
              example: false,
              description: 'Whether the coaching center is exclusively for disabled students (required)',
            },
            experience: {
              type: 'number',
              minimum: 0,
              example: 5,
              description: 'Number of years of experience (required, must be a non-negative integer)',
            },
          },
        },
        CoachingCenterUpdateRequest: {
          type: 'object',
          required: [
            'allowed_genders',
            'allowed_disabled',
            'is_only_for_disabled',
            'experience',
          ],
          description: 'Update coaching center request. The fields allowed_genders, allowed_disabled, is_only_for_disabled, and experience are required. Other fields are optional. If status is set to "published", all required fields must be present (either from existing data or in this update).',
          properties: {
            userId: {
              type: 'string',
              description: 'ID of the academy user who owns this center. Only admins can provide this to change owner.',
              example: 'f316a86c-2909-4d32-8983-eb225c715bcb',
            },
            center_name: {
              type: 'string',
              maxLength: 255,
              example: 'Elite Sports Academy',
              description: 'Name of the coaching center',
            },
            mobile_number: {
              type: 'string',
              pattern: '^[6-9]\\d{9}$',
              example: '9876543210',
              description: 'Mobile number (10 digits, starting with 6-9). Required if status is "published".',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'info@elitesportsacademy.com',
              description: 'Email address. Required if status is "published".',
            },
            rules_regulation: {
              type: 'array',
              items: {
                type: 'string',
                maxLength: 500,
              },
              nullable: true,
              example: ['All students must wear proper sports attire', 'Punctuality is mandatory'],
              description: 'Rules and regulations (array of strings)',
            },
            logo: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://bucket.s3.region.amazonaws.com/logos/elite-academy.png',
              description: 'Logo URL. Required if status is "published".',
            },
            sports: {
              type: 'array',
              items: {
                type: 'string',
                description: 'Sport ObjectId',
              },
              example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
              description: 'Array of sport IDs (for quick reference/search). Required if status is "published".',
            },
            sport_details: {
              type: 'array',
              items: {
                type: 'object',
                required: ['sport_id', 'description'],
                properties: {
                  sport_id: {
                    type: 'string',
                    example: '507f1f77bcf86cd799439011',
                    description: 'Sport ObjectId (must be in sports array)',
                  },
                  description: {
                    type: 'string',
                    minLength: 5,
                    maxLength: 2000,
                    example: 'Professional cricket coaching with international level facilities.',
                    description: 'Sport-specific description (min 5 characters)',
                  },
                  images: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        unique_id: { type: 'string', example: 'aeddb4dc-35e7-4b86-b08a-03f93a487a4b' },
                        url: { type: 'string', format: 'uri', example: 'https://bucket.s3.region.amazonaws.com/images/coachingCentres/cricket1.jpg' },
                        is_active: { type: 'boolean', default: true },
                        is_deleted: { type: 'boolean', default: false },
                      },
                    },
                    description: 'Sport-specific images',
                  },
                  videos: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        unique_id: { type: 'string', example: 'c3g4d6ef-57g9-6d08-d20c-25h15c609c6d' },
                        url: { type: 'string', format: 'uri', example: 'https://bucket.s3.region.amazonaws.com/videos/coachingCentres/cricket-training.mp4' },
                        thumbnail: { 
                          type: 'string', 
                          format: 'uri', 
                          nullable: true,
                          example: 'https://bucket.s3.region.amazonaws.com/videos/coachingCentres/cricket-training_thumb.jpg',
                          description: 'Video thumbnail URL (auto-generated if not provided)',
                        },
                        is_active: { type: 'boolean', default: true },
                        is_deleted: { type: 'boolean', default: false },
                      },
                    },
                    description: 'Sport-specific videos (thumbnail auto-generated if not provided)',
                  },
                },
              },
              description: 'Sport-specific data (description, images, videos). Required if status is "published".',
            },
            age: {
              type: 'object',
              properties: {
                min: {
                  type: 'integer',
                  minimum: 3,
                  maximum: 18,
                  example: 5,
                },
                max: {
                  type: 'integer',
                  minimum: 3,
                  maximum: 18,
                  example: 18,
                },
              },
              description: 'Age range. Required if status is "published".',
            },
            location: {
              type: 'object',
              properties: {
                latitude: {
                  type: 'number',
                  minimum: -90,
                  maximum: 90,
                  example: 28.6139,
                },
                longitude: {
                  type: 'number',
                  minimum: -180,
                  maximum: 180,
                  example: 77.209,
                },
                address: {
                  type: 'object',
                  required: ['line2', 'city', 'state', 'pincode'],
                  properties: {
                    line1: {
                      type: 'string',
                      nullable: true,
                      example: '123 Main Street',
                    },
                    line2: {
                      type: 'string',
                      example: 'Block A',
                    },
                    city: {
                      type: 'string',
                      example: 'New Delhi',
                    },
                    state: {
                      type: 'string',
                      example: 'Delhi',
                    },
                    country: {
                      type: 'string',
                      nullable: true,
                      example: 'India',
                    },
                    pincode: {
                      type: 'string',
                      pattern: '^\\d{6}$',
                      example: '110001',
                    },
                  },
                },
              },
              description: 'Location with address. Required if status is "published".',
            },
            facility: {
              oneOf: [
                {
                  type: 'array',
                  items: {
                    oneOf: [
                      {
                        type: 'string',
                        example: '507f1f77bcf86cd799439011',
                        description: 'Existing facility ID',
                      },
                      {
                        type: 'object',
                        properties: {
                          name: {
                            type: 'string',
                            example: 'Swimming Pool',
                            description: 'Facility name (required)',
                          },
                        },
                        required: ['name'],
                        description: 'New facility object',
                      },
                    ],
                  },
                },
                {
                  type: 'null',
                },
              ],
              description: 'Array of facility IDs (strings) or facility objects (for new facilities), or null to clear facilities',
            },
            operational_timing: {
              type: 'object',
              properties: {
                operating_days: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
                  },
                  example: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                  description: 'Days of operation',
                },
                opening_time: {
                  type: 'string',
                  example: '09:00',
                  pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$',
                  description: 'Opening time in HH:MM format',
                },
                closing_time: {
                  type: 'string',
                  example: '18:00',
                  pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$',
                  description: 'Closing time in HH:MM format',
                },
              },
              description: 'Operational timing. Required if status is "published".',
            },
            documents: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  unique_id: { type: 'string', example: 'h8l9i1jk-02l4-1i53-i75h-70m60h154h1i' },
                  url: { type: 'string', format: 'uri', example: 'https://bucket.s3.region.amazonaws.com/documents/coachingCentres/certificate.pdf' },
                  is_active: { type: 'boolean', default: true },
                  is_deleted: { type: 'boolean', default: false },
                },
              },
              description: 'General documents (not sport-specific)',
            },
            bank_information: {
              type: 'object',
              properties: {
                bank_name: {
                  type: 'string',
                  example: 'State Bank of India',
                },
                account_number: {
                  type: 'string',
                  example: '1234567890123456',
                },
                ifsc_code: {
                  type: 'string',
                  example: 'SBIN0001234',
                },
                account_holder_name: {
                  type: 'string',
                  example: 'Elite Sports Academy',
                },
                gst_number: {
                  type: 'string',
                  example: '07AABCU9603R1ZX',
                  description: 'GST number (optional)',
                  nullable: true,
                },
              },
              description: 'Bank information. Required if status is "published".',
            },
            status: {
              type: 'string',
              enum: ['draft', 'published'],
              example: 'published',
              description: 'Status of the coaching center. If set to "published", all required fields must be present (either in this update or existing data).',
            },
            allowed_genders: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['male', 'female', 'other'],
              },
              minItems: 1,
              example: ['male', 'female'],
              description: 'Array of allowed genders for the coaching center (required, at least one gender must be selected)',
            },
            allowed_disabled: {
              type: 'boolean',
              example: false,
              description: 'Whether disabled students are allowed (required)',
            },
            is_only_for_disabled: {
              type: 'boolean',
              example: false,
              description: 'Whether the coaching center is exclusively for disabled students (required)',
            },
            experience: {
              type: 'number',
              minimum: 0,
              example: 5,
              description: 'Number of years of experience (required, must be a non-negative integer)',
            },
          },
        },
        CoachingCenter: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            center_name: {
              type: 'string',
              example: 'Elite Sports Academy',
            },
            mobile_number: {
              type: 'string',
              example: '9876543210',
            },
            email: {
              type: 'string',
              example: 'info@elitesportsacademy.com',
            },
            rules_regulation: {
              type: 'array',
              items: {
                type: 'string',
                maxLength: 500,
              },
            },
            logo: {
              type: 'string',
              format: 'uri',
            },
            sports: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/SportListItem',
              },
              description: 'Array of sport references (populated)',
            },
            sport_details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  sport_id: {
                    type: 'object',
                    $ref: '#/components/schemas/SportListItem',
                    description: 'Sport reference (populated)',
                  },
                  description: {
                    type: 'string',
                    example: 'Professional cricket coaching with international level facilities.',
                  },
                  images: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        unique_id: { type: 'string' },
                        url: { type: 'string', format: 'uri' },
                        is_active: { type: 'boolean' },
                        is_deleted: { type: 'boolean' },
                      },
                    },
                  },
                  videos: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        unique_id: { type: 'string' },
                        url: { type: 'string', format: 'uri' },
                        thumbnail: { type: 'string', format: 'uri', nullable: true },
                        is_active: { type: 'boolean' },
                        is_deleted: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
              description: 'Sport-specific data (description, images, videos)',
            },
            age: {
              type: 'object',
              properties: {
                min: { type: 'number' },
                max: { type: 'number' },
              },
            },
            location: {
              type: 'object',
              properties: {
                latitude: { type: 'number' },
                longitude: { type: 'number' },
                address: {
                  type: 'object',
                  properties: {
                    line1: { type: 'string' },
                    line2: { type: 'string' },
                    city: { type: 'string' },
                    state: { type: 'string' },
                    country: { type: 'string' },
                    pincode: { type: 'string' },
                  },
                },
              },
            },
            facility: {
              type: 'object',
              properties: {
                custom_id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                icon: { type: 'string' },
              },
            },
            operational_timing: {
              type: 'object',
              properties: {
                operating_days: {
                  type: 'array',
                  items: { type: 'string' },
                },
                opening_time: { type: 'string' },
                closing_time: { type: 'string' },
              },
            },
            documents: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  unique_id: { type: 'string' },
                  url: { type: 'string', format: 'uri' },
                  is_active: { type: 'boolean' },
                  is_deleted: { type: 'boolean' },
                },
              },
              description: 'General documents (not sport-specific). Sport-specific images and videos are in sport_details.',
            },
            bank_information: {
              type: 'object',
              properties: {
                bank_name: { type: 'string' },
                account_number: { type: 'string' },
                ifsc_code: { type: 'string' },
                account_holder_name: { type: 'string' },
                gst_number: { type: 'string' },
              },
            },
            status: {
              type: 'string',
              enum: ['draft', 'published'],
            },
            allowed_genders: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['male', 'female', 'other'],
              },
              example: ['male', 'female'],
              description: 'Array of allowed genders for the coaching center',
            },
            allowed_disabled: {
              type: 'boolean',
              example: false,
              description: 'Whether disabled students are allowed',
            },
            is_only_for_disabled: {
              type: 'boolean',
              example: false,
              description: 'Whether the coaching center is exclusively for disabled students',
            },
            experience: {
              type: 'number',
              minimum: 0,
              example: 5,
              description: 'Number of years of experience',
            },
            is_active: {
              type: 'boolean',
            },
            is_deleted: {
              type: 'boolean',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        AcademyListItem: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            custom_id: {
              type: 'string',
              nullable: true,
              example: 'f316a86c-2909-4d32-8983-eb225c715bcb',
              description: "User's custom ID (academy owner's user ID)",
            },
            center_name: {
              type: 'string',
              example: 'Elite Sports Academy',
            },
            logo: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://bucket.s3.region.amazonaws.com/logos/elite-academy.png',
            },
            image: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://bucket.s3.region.amazonaws.com/images/academy-image.jpg',
              description: 'One image from sport_details',
            },
            location: {
              type: 'object',
              properties: {
                latitude: {
                  type: 'number',
                  example: 28.6139,
                },
                longitude: {
                  type: 'number',
                  example: 77.209,
                },
                address: {
                  type: 'object',
                  properties: {
                    line1: {
                      type: 'string',
                      nullable: true,
                    },
                    line2: {
                      type: 'string',
                      example: 'Near Metro Station',
                    },
                    city: {
                      type: 'string',
                      example: 'New Delhi',
                    },
                    state: {
                      type: 'string',
                      example: 'Delhi',
                    },
                    country: {
                      type: 'string',
                      nullable: true,
                      example: 'India',
                    },
                    pincode: {
                      type: 'string',
                      example: '110001',
                    },
                  },
                },
              },
            },
            sports: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/SportListItem',
              },
            },
            age: {
              type: 'object',
              properties: {
                min: {
                  type: 'number',
                  example: 5,
                },
                max: {
                  type: 'number',
                  example: 18,
                },
              },
            },
            allowed_genders: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['male', 'female', 'other'],
              },
              example: ['male', 'female'],
              description: 'Array of allowed genders for the academy',
            },
            distance: {
              type: 'number',
              nullable: true,
              example: 2.5,
              description: 'Distance in kilometers (if location provided)',
            },
          },
        },
        PopularSport: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
              description: 'MongoDB Object ID',
            },
            custom_id: {
              type: 'string',
              format: 'uuid',
              example: '06da21af-f11c-4cd9-8ecc-b21d3de9ad2c',
              description: 'Unique identifier for the sport',
            },
            name: {
              type: 'string',
              example: 'Cricket',
              description: 'Name of the sport',
            },
            slug: {
              type: 'string',
              nullable: true,
              example: 'cricket',
              description: 'URL-friendly slug for the sport',
            },
            logo: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://bucket.s3.region.amazonaws.com/logos/cricket.png',
              description: 'Logo URL of the sport',
            },
            is_popular: {
              type: 'boolean',
              example: true,
              description: 'Whether the sport is marked as popular',
            },
            is_active: {
              type: 'boolean',
              example: true,
              description: 'Whether the sport is active',
            },
          },
        },
        SportCreate: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              type: 'string',
              example: 'Football',
              description: 'Name of the sport',
            },
            logo: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://bucket.s3.region.amazonaws.com/logos/football.png',
              description: 'Logo URL of the sport',
            },
            is_active: {
              type: 'boolean',
              example: true,
              default: true,
              description: 'Whether the sport is active',
            },
            is_popular: {
              type: 'boolean',
              example: false,
              default: false,
              description: 'Whether the sport is marked as popular',
            },
          },
        },
        SportUpdate: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              example: 'Football Updated',
              description: 'Name of the sport',
            },
            logo: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://bucket.s3.region.amazonaws.com/logos/football-updated.png',
              description: 'Logo URL of the sport',
            },
            is_active: {
              type: 'boolean',
              example: true,
              description: 'Whether the sport is active',
            },
            is_popular: {
              type: 'boolean',
              example: true,
              description: 'Whether the sport is marked as popular',
            },
          },
        },
        HomeData: {
          type: 'object',
          properties: {
            nearbyAcademies: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/AcademyListItem',
              },
              description: 'List of nearby academies (up to 12, sorted by distance)',
            },
            popularSports: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/PopularSport',
              },
              description: 'List of 8 popular sports',
            },
            popular_reels: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/PopularReel',
              },
              description: 'List of popular reels (top 5 by views count)',
            },
          },
        },
        AcademyDetail: {
          allOf: [
            {
              $ref: '#/components/schemas/AcademyListItem',
            },
            {
              type: 'object',
              properties: {
                mobile_number: {
                  type: 'string',
                  nullable: true,
                  example: '98****10',
                  description: 'Masked if user not logged in',
                },
                email: {
                  type: 'string',
                  nullable: true,
                  example: 'in***@elitesportsacademy.com',
                  description: 'Masked if user not logged in',
                },
                rules_regulation: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                  nullable: true,
                },
                sport_details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      sport_id: {
                        $ref: '#/components/schemas/SportListItem',
                      },
                      description: {
                        type: 'string',
                      },
                      images: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            unique_id: { type: 'string' },
                            url: { type: 'string', format: 'uri' },
                            is_active: { type: 'boolean' },
                          },
                        },
                      },
                      videos: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            unique_id: { type: 'string' },
                            url: { type: 'string', format: 'uri' },
                            thumbnail: { type: 'string', format: 'uri', nullable: true },
                            is_active: { type: 'boolean' },
                          },
                        },
                      },
                    },
                  },
                },
                facility: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      _id: { type: 'string' },
                      custom_id: { type: 'string' },
                      name: { type: 'string' },
                      description: { type: 'string', nullable: true },
                      icon: { type: 'string', format: 'uri', nullable: true },
                    },
                  },
                },
                operational_timing: {
                  type: 'object',
                  properties: {
                    operating_days: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    opening_time: { type: 'string', example: '09:00' },
                    closing_time: { type: 'string', example: '18:00' },
                  },
                },
                allowed_genders: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['male', 'female', 'other'],
                  },
                },
                allowed_disabled: { type: 'boolean' },
                is_only_for_disabled: { type: 'boolean' },
                batches: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      _id: { type: 'string' },
                      name: { type: 'string' },
                      sport: {
                        type: 'object',
                        properties: {
                          _id: { type: 'string' },
                          custom_id: { type: 'string' },
                          name: { type: 'string' },
                          logo: { type: 'string', format: 'uri', nullable: true },
                        },
                      },
                      scheduled: {
                        type: 'object',
                        properties: {
                          start_date: { type: 'string', format: 'date' },
                          start_time: { type: 'string', example: '09:00' },
                          end_time: { type: 'string', example: '18:00' },
                          training_days: {
                            type: 'array',
                            items: { type: 'string' },
                          },
                        },
                      },
                      duration: {
                        type: 'object',
                        properties: {
                          count: { type: 'number' },
                          type: { type: 'string' },
                        },
                      },
                      capacity: {
                        type: 'object',
                        properties: {
                          min: { type: 'number' },
                          max: { type: 'number', nullable: true },
                        },
                      },
                      age: {
                        type: 'object',
                        properties: {
                          min: { type: 'number' },
                          max: { type: 'number' },
                        },
                      },
                      admission_fee: { type: 'number', nullable: true },
                      fee_structure: {
                        type: 'object',
                        nullable: true,
                        properties: {
                          fee_type: { type: 'string' },
                          fee_configuration: { type: 'object' },
                          admission_fee: { type: 'number', nullable: true },
                        },
                      },
                      status: { type: 'string' },
                      is_active: { type: 'boolean' },
                    },
                  },
                  nullable: true,
                },
              },
            },
          ],
        },
        Employee: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            userId: {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                id: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                email: { type: 'string' },
              },
            },
            fullName: {
              type: 'string',
              example: 'John Doe',
            },
            role: {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                id: { type: 'string' },
                name: { type: 'string' },
              },
            },
            mobileNo: {
              type: 'string',
              example: '9876543210',
            },
            email: {
              type: 'string',
              example: 'john@example.com',
              nullable: true,
            },
            sport: {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                custom_id: { type: 'string' },
                name: { type: 'string' },
                logo: { type: 'string' },
              },
              nullable: true,
            },
            center: {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                center_name: { type: 'string' },
                email: { type: 'string' },
                mobile_number: { type: 'string' },
              },
              nullable: true,
            },
            experience: {
              type: 'number',
              example: 5,
              nullable: true,
            },
            workingHours: {
              type: 'string',
              example: '9:00 AM - 6:00 PM',
            },
            extraHours: {
              type: 'string',
              example: '2 hours',
              nullable: true,
            },
            certification: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'CPR Certification' },
                  fileUrl: { type: 'string', format: 'uri', example: 'https://bucket.s3.region.amazonaws.com/temp/images/coaching/employee/uuid.pdf' },
                },
              },
              nullable: true,
            },
            salary: {
              type: 'number',
              example: 50000,
              nullable: true,
            },
            is_active: {
              type: 'boolean',
              example: true,
            },
            is_deleted: {
              type: 'boolean',
              example: false,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        EmployeeCreateRequest: {
          type: 'object',
          required: ['fullName', 'role', 'mobileNo', 'workingHours'],
          properties: {
            fullName: {
              type: 'string',
              example: 'John Doe',
              description: 'Full name (letters and spaces only)',
            },
            role: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
              description: 'Role ObjectId',
            },
            mobileNo: {
              type: 'string',
              pattern: '^[6-9]\\d{9}$',
              example: '9876543210',
              description: 'Mobile number (10 digits, starting with 6-9)',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john@example.com',
              description: 'Email address (optional)',
            },
            sport: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
              description: 'Sport ObjectId (optional)',
            },
            center: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
              description: 'Coaching Center ObjectId (optional)',
            },
            experience: {
              type: 'number',
              example: 5,
              description: 'Years of experience (optional)',
            },
            workingHours: {
              type: 'string',
              example: '9:00 AM - 6:00 PM',
              description: 'Working hours',
            },
            extraHours: {
              type: 'string',
              example: '2 hours',
              description: 'Extra hours (optional)',
            },
            certification: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'CPR Certification' },
                  fileUrl: { type: 'string', format: 'uri', example: 'https://bucket.s3.region.amazonaws.com/temp/images/coaching/employee/uuid.pdf' },
                },
              },
              description: 'Certification documents (optional)',
            },
            salary: {
              type: 'number',
              example: 50000,
              description: 'Salary (optional)',
            },
          },
        },
        EmployeeUpdateRequest: {
          type: 'object',
          description: 'Update employee request. All fields are optional.',
          properties: {
            fullName: {
              type: 'string',
              example: 'John Doe',
              description: 'Full name (letters and spaces only)',
            },
            role: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
              description: 'Role ObjectId',
            },
            mobileNo: {
              type: 'string',
              pattern: '^[6-9]\\d{9}$',
              example: '9876543210',
              description: 'Mobile number (10 digits, starting with 6-9)',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john@example.com',
              description: 'Email address',
            },
            sport: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
              description: 'Sport ObjectId',
            },
            center: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
              description: 'Coaching Center ObjectId',
            },
            experience: {
              type: 'number',
              example: 5,
              description: 'Years of experience',
            },
            workingHours: {
              type: 'string',
              example: '9:00 AM - 6:00 PM',
              description: 'Working hours',
            },
            extraHours: {
              type: 'string',
              example: '2 hours',
              description: 'Extra hours',
            },
            certification: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'CPR Certification' },
                  fileUrl: { type: 'string', format: 'uri', example: 'https://bucket.s3.region.amazonaws.com/temp/images/coaching/employee/uuid.pdf' },
                },
              },
              description: 'Certification documents',
            },
            salary: {
              type: 'number',
              example: 50000,
              description: 'Salary',
            },
          },
        },
        Participant: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            userId: {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                id: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                email: { type: 'string' },
              },
            },
            firstName: {
              type: 'string',
              example: 'John',
              nullable: true,
            },
            lastName: {
              type: 'string',
              example: 'Doe',
              nullable: true,
            },
            gender: {
              type: 'number',
              enum: [0, 1, 2],
              example: 0,
              description: '0 = male, 1 = female, 2 = other',
              nullable: true,
            },
            disability: {
              type: 'number',
              enum: [0, 1],
              example: 0,
              description: '0 = no, 1 = yes',
            },
            dob: {
              type: 'string',
              format: 'date',
              example: '1990-01-01',
              nullable: true,
            },
            schoolName: {
              type: 'string',
              example: 'ABC School',
              nullable: true,
            },
            contactNumber: {
              type: 'string',
              example: '9876543210',
              nullable: true,
            },
            profilePhoto: {
              type: 'string',
              format: 'uri',
              example: 'https://example.com/photo.jpg',
              nullable: true,
            },
            address: {
              type: 'object',
              properties: {
                line1: { type: 'string', example: '123 Main Street' },
                line2: { type: 'string', example: 'Apt 4B', nullable: true },
                area: { type: 'string', example: 'Downtown', nullable: true },
                city: { type: 'string', example: 'Mumbai' },
                state: { type: 'string', example: 'Maharashtra' },
                country: { type: 'string', example: 'India' },
                pincode: { type: 'string', example: '400001' },
                isDeleted: { type: 'boolean', example: false },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
              nullable: true,
            },
            isSelf: {
              type: 'string',
              example: '1',
              nullable: true,
              description: "'1' for self, null otherwise",
            },
            is_active: {
              type: 'boolean',
              example: true,
            },
            is_deleted: {
              type: 'boolean',
              example: false,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        ParticipantCreateRequest: {
          type: 'object',
          description: 'Create participant request. All fields are optional.',
          properties: {
            firstName: {
              type: 'string',
              example: 'John',
              maxLength: 191,
            },
            lastName: {
              type: 'string',
              example: 'Doe',
              maxLength: 191,
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other'],
              example: 'male',
              description: 'Gender: male, female, or other',
            },
            disability: {
              type: 'string',
              enum: ['0', '1'],
              example: '0',
              description: '0 = no, 1 = yes',
              default: '0',
            },
            dob: {
              type: 'string',
              format: 'date',
              example: '1990-01-01',
            },
            schoolName: {
              type: 'string',
              example: 'ABC School',
              maxLength: 191,
            },
            contactNumber: {
              type: 'string',
              example: '9876543210',
              maxLength: 255,
            },
            profilePhoto: {
              type: 'string',
              format: 'uri',
              example: 'https://example.com/photo.jpg',
              maxLength: 191,
            },
            address: {
              type: 'object',
              properties: {
                line1: { type: 'string', example: '123 Main Street', maxLength: 255 },
                line2: { type: 'string', example: 'Apt 4B', maxLength: 255, nullable: true },
                area: { type: 'string', example: 'Downtown', maxLength: 255, nullable: true },
                city: { type: 'string', example: 'Mumbai', maxLength: 255, nullable: true },
                state: { type: 'string', example: 'Maharashtra', maxLength: 255, nullable: true },
                country: { type: 'string', example: 'India', maxLength: 255, nullable: true },
                pincode: { type: 'string', example: '400001', maxLength: 191, nullable: true },
              },
            },
            // isSelf is not allowed in create requests - it's automatically set to null
            // Only the system sets isSelf = '1' when creating a user
          },
        },
        ParticipantUpdateRequest: {
          type: 'object',
          description: 'Update participant request. All fields are optional.',
          properties: {
            firstName: {
              type: 'string',
              example: 'John',
              maxLength: 191,
            },
            lastName: {
              type: 'string',
              example: 'Doe',
              maxLength: 191,
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other'],
              example: 'male',
              description: 'Gender: male, female, or other',
            },
            disability: {
              type: 'string',
              enum: ['0', '1'],
              example: '0',
              description: '0 = no, 1 = yes',
            },
            dob: {
              type: 'string',
              format: 'date',
              example: '1990-01-01',
            },
            schoolName: {
              type: 'string',
              example: 'ABC School',
              maxLength: 191,
            },
            contactNumber: {
              type: 'string',
              example: '9876543210',
              maxLength: 255,
            },
            profilePhoto: {
              type: 'string',
              format: 'uri',
              example: 'https://example.com/photo.jpg',
              maxLength: 191,
            },
            address: {
              type: 'object',
              properties: {
                line1: { type: 'string', example: '123 Main Street', maxLength: 255 },
                line2: { type: 'string', example: 'Apt 4B', maxLength: 255, nullable: true },
                area: { type: 'string', example: 'Downtown', maxLength: 255, nullable: true },
                city: { type: 'string', example: 'Mumbai', maxLength: 255, nullable: true },
                state: { type: 'string', example: 'Maharashtra', maxLength: 255, nullable: true },
                country: { type: 'string', example: 'India', maxLength: 255, nullable: true },
                pincode: { type: 'string', example: '400001', maxLength: 191, nullable: true },
              },
            },
            isSelf: {
              type: 'string',
              example: '1',
              maxLength: 191,
              description: "'1' for self, null otherwise",
            },
          },
        },
        Role: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
              description: 'Role ObjectId (MongoDB _id)',
            },
            name: {
              type: 'string',
              example: 'academy',
              description: 'Role name',
            },
            description: {
              type: 'string',
              example: 'Academy user with coaching center management permissions',
              nullable: true,
              description: 'Role description',
            },
            isSystemDefined: {
              type: 'boolean',
              example: true,
              description: 'Indicates if the role is a system-defined role (cannot be deleted or have name changed). System roles include: super_admin, admin, user, academy, student, guardian, employee, agent.',
            },
            userCount: {
              type: 'number',
              example: 42,
              description: 'Number of active (non-deleted) users assigned to this role',
            },
          },
        },
        FeeType: {
          type: 'object',
          properties: {
            value: {
              type: 'string',
              enum: ['monthly', 'daily', 'weekly', 'hourly', 'per_batch', 'per_session', 'age_based', 'coach_license_based', 'player_level_based', 'seasonal', 'package_based', 'group_discount', 'advance_booking', 'weekend_pricing', 'peak_hours', 'membership_based', 'custom'],
              example: 'monthly',
              description: 'Fee type value',
            },
            label: {
              type: 'string',
              example: 'Monthly',
              description: 'Display label for the fee type',
            },
            description: {
              type: 'string',
              example: 'Fixed monthly fee structure',
              description: 'Description of the fee type',
            },
          },
        },
        FormField: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              example: 'base_price',
              description: 'Field name',
            },
            label: {
              type: 'string',
              example: 'Base Price',
              description: 'Display label',
            },
            type: {
              type: 'string',
              enum: ['text', 'number', 'select', 'checkbox', 'date', 'time', 'array', 'object'],
              example: 'number',
              description: 'Field type',
            },
            required: {
              type: 'boolean',
              example: true,
              description: 'Whether the field is required',
            },
            placeholder: {
              type: 'string',
              example: 'Enter base price',
              nullable: true,
              description: 'Placeholder text',
            },
            min: {
              type: 'number',
              example: 0,
              nullable: true,
              description: 'Minimum value (for number fields)',
            },
            max: {
              type: 'number',
              example: 1000000,
              nullable: true,
              description: 'Maximum value (for number fields)',
            },
            step: {
              type: 'number',
              example: 0.01,
              nullable: true,
              description: 'Step value (for number fields)',
            },
            options: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  value: {
                    oneOf: [{ type: 'string' }, { type: 'number' }],
                  },
                  label: { type: 'string' },
                },
              },
              nullable: true,
              description: 'Options for select fields',
            },
            fields: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/FormField',
              },
              nullable: true,
              description: 'Nested fields for array/object types',
            },
            description: {
              type: 'string',
              nullable: true,
              description: 'Field description',
            },
          },
        },
        FeeTypeConfig: {
          type: 'object',
          properties: {
            fee_type: {
              type: 'string',
              enum: ['monthly', 'daily', 'weekly', 'hourly', 'per_batch', 'per_session', 'age_based', 'coach_license_based', 'player_level_based', 'seasonal', 'package_based', 'group_discount', 'advance_booking', 'weekend_pricing', 'peak_hours', 'membership_based', 'custom'],
              example: 'monthly',
            },
            label: {
              type: 'string',
              example: 'Monthly',
            },
            description: {
              type: 'string',
              example: 'Fixed monthly fee structure',
            },
            formFields: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/FormField',
              },
            },
          },
        },
        FeeTypesResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Fee types retrieved successfully',
            },
            data: {
              type: 'object',
              properties: {
                feeTypes: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/FeeType',
                  },
                },
              },
            },
          },
        },
        FeeTypeConfigResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Fee type form structure retrieved successfully',
            },
            data: {
              type: 'object',
              properties: {
                config: {
                  $ref: '#/components/schemas/FeeTypeConfig',
                },
              },
            },
          },
        },
        FeeStructure: {
          type: 'object',
          required: ['fee_type', 'fee_configuration'],
          properties: {
            fee_type: {
              type: 'string',
              enum: ['monthly', 'daily', 'weekly', 'hourly', 'per_batch', 'per_session', 'age_based', 'coach_license_based', 'player_level_based', 'seasonal', 'package_based', 'group_discount', 'advance_booking', 'weekend_pricing', 'peak_hours', 'membership_based', 'custom'],
              example: 'monthly',
              description: 'Fee type',
            },
            fee_configuration: {
              type: 'object',
              additionalProperties: true,
              description: 'Dynamic configuration object based on fee_type',
              example: {
                base_price: 2000,
              },
            },
          },
        },
        Batch: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
              description: 'Batch ObjectId',
            },
            user: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
              description: 'User ObjectId reference',
            },
            name: {
              type: 'string',
              example: 'Morning Batch',
              description: 'Batch name',
            },
            sport: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
              description: 'Sport ObjectId reference',
            },
            center: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
              description: 'Coaching Center ObjectId reference',
            },
            coach: {
              type: 'string',
              nullable: true,
              example: '507f1f77bcf86cd799439011',
              description: 'Employee ObjectId reference (optional)',
            },
            scheduled: {
              type: 'object',
              properties: {
                start_date: {
                  type: 'string',
                  format: 'date',
                  example: '2024-01-15',
                },
                start_time: {
                  type: 'string',
                  example: '09:00',
                },
                end_time: {
                  type: 'string',
                  example: '11:00',
                },
                training_days: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
                  },
                  example: ['monday', 'wednesday', 'friday'],
                },
              },
            },
            duration: {
              type: 'object',
              properties: {
                count: {
                  type: 'number',
                  example: 3,
                },
                type: {
                  type: 'string',
                  enum: ['day', 'month', 'week', 'year'],
                  example: 'month',
                },
              },
            },
            capacity: {
              type: 'object',
              properties: {
                min: {
                  type: 'number',
                  example: 10,
                },
                max: {
                  type: 'number',
                  nullable: true,
                  example: 30,
                },
              },
            },
            age: {
              type: 'object',
              properties: {
                min: {
                  type: 'number',
                  example: 8,
                  minimum: 3,
                  maximum: 18,
                },
                max: {
                  type: 'number',
                  example: 16,
                  minimum: 3,
                  maximum: 18,
                },
              },
            },
            admission_fee: {
              type: 'number',
              nullable: true,
              example: 5000,
              description: 'Admission fee',
            },
            fee_structure: {
              $ref: '#/components/schemas/FeeStructure',
              description: 'Fee structure configuration (required)',
            },
            status: {
              type: 'string',
              enum: ['published', 'draft', 'inactive'],
              example: 'draft',
            },
            is_active: {
              type: 'boolean',
              example: true,
            },
            is_deleted: {
              type: 'boolean',
              example: false,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        BatchResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Batch created successfully',
            },
            data: {
              type: 'object',
              properties: {
                batch: {
                  $ref: '#/components/schemas/Batch',
                },
              },
            },
          },
        },
        BatchListResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Batches retrieved successfully',
            },
            data: {
              type: 'object',
              properties: {
                batches: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Batch',
                  },
                },
                pagination: {
                  type: 'object',
                  properties: {
                    page: {
                      type: 'number',
                      example: 1,
                    },
                    limit: {
                      type: 'number',
                      example: 10,
                    },
                    total: {
                      type: 'number',
                      example: 50,
                    },
                    totalPages: {
                      type: 'number',
                      example: 5,
                    },
                    hasNextPage: {
                      type: 'boolean',
                      example: true,
                    },
                    hasPrevPage: {
                      type: 'boolean',
                      example: false,
                    },
                  },
                },
              },
            },
          },
        },
        BookingListItem: {
          type: 'object',
          description: 'Simplified booking information for listing endpoints',
          properties: {
            booking_id: {
              type: 'string',
              example: 'BK-2024-0001',
              description: 'Unique booking reference ID (format: BK-YYYY-NNNN)',
            },
            id: {
              type: 'string',
              example: 'f316a86c-2909-4d32-8983-eb225c715bcb',
              description: 'Booking UUID',
            },
            user_name: {
              type: 'string',
              example: 'John Doe',
              description: 'Full name of the user who made the booking',
            },
            student_name: {
              type: 'string',
              example: 'Alice Smith, Bob Smith',
              description: 'Participant name(s) - comma-separated if multiple',
            },
            batch_name: {
              type: 'string',
              example: 'Morning Batch',
              description: 'Name of the batch',
            },
            center_name: {
              type: 'string',
              example: 'ABC Sports Academy',
              description: 'Name of the coaching center',
            },
            amount: {
              type: 'number',
              example: 5000,
              description: 'Total booking amount in rupees',
            },
            payment_status: {
              type: 'string',
              enum: ['pending', 'processing', 'success', 'failed', 'refunded', 'cancelled'],
              example: 'success',
              description: 'Payment status',
            },
            payment_method: {
              type: 'string',
              nullable: true,
              example: 'card',
              description: 'Payment method used (e.g., card, netbanking, upi)',
            },
            invoice_id: {
              type: 'string',
              nullable: true,
              example: 'order_1234567890',
              description: 'Razorpay order ID (invoice reference)',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
              description: 'Booking creation timestamp',
            },
          },
        },
        UserBookingListItem: {
          type: 'object',
          description: 'User booking information with enrolled batch details',
          properties: {
            booking_id: {
              type: 'string',
              example: 'BK-2024-0001',
              description: 'Unique booking reference ID (format: BK-YYYY-NNNN)',
            },
            id: {
              type: 'string',
              example: 'f316a86c-2909-4d32-8983-eb225c715bcb',
              description: 'Booking UUID',
            },
            batch: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: 'batch-id-here',
                },
                name: {
                  type: 'string',
                  example: 'Morning Batch',
                },
                sport: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'string',
                      example: 'sport-id-here',
                    },
                    name: {
                      type: 'string',
                      example: 'Cricket',
                    },
                  },
                },
                center: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'string',
                      example: 'center-id-here',
                    },
                    center_name: {
                      type: 'string',
                      example: 'ABC Sports Academy',
                    },
                  },
                },
                scheduled: {
                  type: 'object',
                  properties: {
                    start_date: {
                      type: 'string',
                      format: 'date',
                      example: '2024-01-01',
                    },
                    start_time: {
                      type: 'string',
                      example: '09:00',
                    },
                    end_time: {
                      type: 'string',
                      example: '11:00',
                    },
                    training_days: {
                      type: 'array',
                      items: {
                        type: 'string',
                      },
                      example: ['Monday', 'Wednesday', 'Friday'],
                    },
                  },
                },
                duration: {
                  type: 'object',
                  properties: {
                    count: {
                      type: 'number',
                      example: 3,
                    },
                    type: {
                      type: 'string',
                      example: 'months',
                    },
                  },
                },
              },
            },
            participants: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    example: 'participant-id-here',
                  },
                  firstName: {
                    type: 'string',
                    example: 'Alice',
                  },
                  lastName: {
                    type: 'string',
                    example: 'Smith',
                  },
                },
              },
            },
            amount: {
              type: 'number',
              example: 5000,
              description: 'Total booking amount in rupees',
            },
            currency: {
              type: 'string',
              example: 'INR',
            },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'cancelled', 'completed'],
              example: 'confirmed',
            },
            payment_status: {
              type: 'string',
              enum: ['pending', 'processing', 'success', 'failed', 'refunded', 'cancelled'],
              example: 'success',
            },
            payment_method: {
              type: 'string',
              nullable: true,
              example: 'card',
            },
            invoice_id: {
              type: 'string',
              nullable: true,
              example: 'order_1234567890',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
            },
          },
        },
        Booking: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'f316a86c-2909-4d32-8983-eb225c715bcb',
              description: 'Booking UUID',
            },
            booking_id: {
              type: 'string',
              nullable: true,
              example: 'BK-2024-0001',
              description: 'Unique booking reference ID (format: BK-YYYY-NNNN)',
            },
            user: {
              $ref: '#/components/schemas/User',
              description: 'User who made the booking',
            },
            participants: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Participant',
              },
              description: 'Participants for whom the booking is made',
            },
            batch: {
              $ref: '#/components/schemas/Batch',
              description: 'Batch being booked',
            },
            center: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                center_name: { type: 'string' },
                email: { type: 'string', nullable: true },
                mobile_number: { type: 'string', nullable: true },
              },
            },
            sport: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                logo: { type: 'string', nullable: true },
              },
            },
            amount: {
              type: 'number',
              example: 5000,
              description: 'Total booking amount in rupees',
            },
            currency: {
              type: 'string',
              example: 'INR',
            },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'cancelled', 'completed'],
              example: 'pending',
            },
            payment: {
              type: 'object',
              properties: {
                razorpay_order_id: {
                  type: 'string',
                  example: 'order_1234567890',
                },
                razorpay_payment_id: {
                  type: 'string',
                  nullable: true,
                  example: 'pay_1234567890',
                },
                razorpay_signature: {
                  type: 'string',
                  nullable: true,
                },
                amount: {
                  type: 'number',
                  example: 5000,
                },
                currency: {
                  type: 'string',
                  example: 'INR',
                },
                status: {
                  type: 'string',
                  enum: ['pending', 'processing', 'success', 'failed', 'refunded', 'cancelled'],
                  example: 'pending',
                },
                payment_method: {
                  type: 'string',
                  nullable: true,
                  example: 'card',
                },
                paid_at: {
                  type: 'string',
                  format: 'date-time',
                  nullable: true,
                },
                failure_reason: {
                  type: 'string',
                  nullable: true,
                },
              },
            },
            notes: {
              type: 'string',
              nullable: true,
              maxLength: 1000,
            },
            is_active: {
              type: 'boolean',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        DeleteOrderRequest: {
          type: 'object',
          required: ['razorpay_order_id'],
          properties: {
            razorpay_order_id: {
              type: 'string',
              example: 'order_1234567890',
              description: 'Razorpay order ID to cancel',
            },
          },
        },
        BookingSummary: {
          type: 'object',
          properties: {
            batch: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                sport: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                  },
                },
                center: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    logo: { type: 'string', nullable: true },
                    address: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        line1: { type: 'string', nullable: true },
                        line2: { type: 'string' },
                        city: { type: 'string' },
                        state: { type: 'string' },
                        country: { type: 'string', nullable: true },
                        pincode: { type: 'string' },
                      },
                    },
                    experience: { type: 'number', nullable: true },
                  },
                },
                scheduled: {
                  type: 'object',
                  properties: {
                    start_date: { type: 'string', format: 'date' },
                    start_time: { type: 'string' },
                    end_time: { type: 'string' },
                    training_days: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                  },
                },
                duration: {
                  type: 'object',
                  properties: {
                    count: { type: 'number' },
                    type: { type: 'string' },
                  },
                },
                admission_fee: {
                  type: 'number',
                  nullable: true,
                },
                fee_structure: {
                  type: 'object',
                  additionalProperties: true,
                },
              },
            },
            participants: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  firstName: { type: 'string', nullable: true },
                  lastName: { type: 'string', nullable: true },
                  age: { type: 'number', nullable: true, description: 'Participant age calculated from date of birth' },
                },
              },
            },
            amount: {
              type: 'number',
              example: 5000,
            },
            currency: {
              type: 'string',
              example: 'INR',
            },
            breakdown: {
              type: 'object',
              properties: {
                admission_fee: {
                  type: 'number',
                  nullable: true,
                },
                base_fee: {
                  type: 'number',
                  nullable: true,
                },
                total: {
                  type: 'number',
                },
              },
            },
          },
        },
        RazorpayOrder: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'order_1234567890',
            },
            entity: {
              type: 'string',
              example: 'order',
            },
            amount: {
              type: 'number',
              example: 500000,
              description: 'Amount in paise',
            },
            amount_paid: {
              type: 'number',
              example: 0,
            },
            amount_due: {
              type: 'number',
              example: 500000,
            },
            currency: {
              type: 'string',
              example: 'INR',
            },
            receipt: {
              type: 'string',
              example: 'booking_1234567890_abc123',
            },
            status: {
              type: 'string',
              example: 'created',
            },
            attempts: {
              type: 'number',
              example: 0,
            },
            created_at: {
              type: 'number',
              example: 1234567890,
            },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'f316a86c-2909-4d32-8983-eb225c715bcb',
            },
            booking: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
              description: 'Booking ObjectId',
            },
            user: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
              description: 'User ObjectId',
            },
            razorpay_order_id: {
              type: 'string',
              example: 'order_1234567890',
            },
            razorpay_payment_id: {
              type: 'string',
              nullable: true,
              example: 'pay_1234567890',
            },
            type: {
              type: 'string',
              enum: ['payment', 'refund', 'partial_refund'],
              example: 'payment',
            },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'success', 'failed', 'cancelled', 'refunded'],
              example: 'pending',
            },
            source: {
              type: 'string',
              enum: ['user_verification', 'webhook', 'manual'],
              example: 'user_verification',
            },
            amount: {
              type: 'number',
              example: 5000,
            },
            currency: {
              type: 'string',
              example: 'INR',
            },
            payment_method: {
              type: 'string',
              nullable: true,
              example: 'card',
            },
            processed_at: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            created_at: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        EnrolledStudentBatch: {
          type: 'object',
          description: 'Batch enrollment information for a student in the list view',
          properties: {
            batchId: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
              description: 'Batch ObjectId',
            },
            batchName: {
              type: 'string',
              example: 'Morning Batch',
              description: 'Name of the batch',
            },
            sport: {
              type: 'object',
              description: 'Sport information for the batch',
              properties: {
                id: {
                  type: 'string',
                  example: '507f1f77bcf86cd799439011',
                  description: 'Sport ObjectId',
                },
                name: {
                  type: 'string',
                  example: 'Cricket',
                  description: 'Name of the sport',
                },
              },
            },
            center: {
              type: 'object',
              description: 'Coaching center information',
              properties: {
                id: {
                  type: 'string',
                  example: '507f1f77bcf86cd799439011',
                  description: 'Center ObjectId',
                },
                name: {
                  type: 'string',
                  example: 'Elite Sports Academy',
                  description: 'Name of the coaching center',
                },
              },
            },
            bookingId: {
              type: 'string',
              example: 'f316a86c-2909-4d32-8983-eb225c715bcb',
              description: 'Booking UUID',
            },
            bookingStatus: {
              type: 'string',
              enum: ['pending', 'confirmed', 'cancelled', 'completed'],
              example: 'confirmed',
              description: 'Status of the booking (pending, confirmed, cancelled, or completed)',
            },
            paymentStatus: {
              type: 'string',
              enum: ['pending', 'processing', 'success', 'failed', 'refunded', 'cancelled'],
              example: 'success',
              description: 'Payment status for the booking',
            },
            enrolledDate: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z',
              description: 'Date when the student was enrolled in this batch',
            },
            amount: {
              type: 'number',
              example: 5000,
              description: 'Booking amount in rupees',
            },
          },
        },
        EnrolledStudent: {
          type: 'object',
          description: 'Enrolled student information in list view - shows student details with age, batch name, sport name, and status',
          properties: {
            participant: {
              type: 'object',
              description: 'Participant (student) details including calculated age',
              properties: {
                id: {
                  type: 'string',
                  example: '507f1f77bcf86cd799439011',
                  description: 'Participant ObjectId',
                },
                firstName: {
                  type: 'string',
                  nullable: true,
                  example: 'John',
                },
                lastName: {
                  type: 'string',
                  nullable: true,
                  example: 'Doe',
                },
                gender: {
                  type: 'number',
                  nullable: true,
                  example: 0,
                  description: '0 = male, 1 = female, 2 = other',
                },
                dob: {
                  type: 'string',
                  format: 'date',
                  nullable: true,
                  example: '2010-05-15',
                  description: 'Date of birth',
                },
                age: {
                  type: 'number',
                  nullable: true,
                  example: 14,
                  description: 'Current age calculated from date of birth (DOB)',
                },
                schoolName: {
                  type: 'string',
                  nullable: true,
                  example: 'ABC School',
                },
                contactNumber: {
                  type: 'string',
                  nullable: true,
                  example: '9876543210',
                },
                profilePhoto: {
                  type: 'string',
                  format: 'uri',
                  nullable: true,
                  example: 'https://bucket.s3.region.amazonaws.com/profile.jpg',
                },
              },
            },
            user: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: 'f316a86c-2909-4d32-8983-eb225c715bcb',
                  description: 'User UUID',
                },
                firstName: {
                  type: 'string',
                  example: 'John',
                },
                lastName: {
                  type: 'string',
                  nullable: true,
                  example: 'Doe',
                },
                email: {
                  type: 'string',
                  example: 'user@example.com',
                },
                mobile: {
                  type: 'string',
                  nullable: true,
                  example: '9876543210',
                },
              },
            },
            batches: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/EnrolledStudentBatch',
              },
              description: 'All batches the student is enrolled in',
            },
            overallStatus: {
              type: 'string',
              enum: ['active', 'left', 'completed', 'pending'],
              example: 'active',
              description: 'Overall status based on batch enrollments (active = has confirmed bookings, left = all cancelled, completed = all completed, pending = all pending)',
            },
            totalEnrollments: {
              type: 'number',
              example: 2,
              description: 'Total number of batch enrollments',
            },
            activeEnrollments: {
              type: 'number',
              example: 1,
              description: 'Number of active (confirmed) enrollments',
            },
          },
        },
        EnrolledStudentDetail: {
          type: 'object',
          properties: {
            participant: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: '507f1f77bcf86cd799439011',
                  description: 'Participant ObjectId',
                },
                firstName: {
                  type: 'string',
                  nullable: true,
                  example: 'John',
                },
                lastName: {
                  type: 'string',
                  nullable: true,
                  example: 'Doe',
                },
                gender: {
                  type: 'number',
                  nullable: true,
                  example: 0,
                  description: '0 = male, 1 = female, 2 = other',
                },
                dob: {
                  type: 'string',
                  format: 'date',
                  nullable: true,
                  example: '2010-05-15',
                },
                age: {
                  type: 'number',
                  nullable: true,
                  example: 14,
                  description: 'Current age calculated from date of birth',
                },
                schoolName: {
                  type: 'string',
                  nullable: true,
                  example: 'ABC School',
                },
                contactNumber: {
                  type: 'string',
                  nullable: true,
                  example: '9876543210',
                },
                profilePhoto: {
                  type: 'string',
                  format: 'uri',
                  nullable: true,
                  example: 'https://bucket.s3.region.amazonaws.com/profile.jpg',
                },
                disability: {
                  type: 'number',
                  nullable: true,
                  example: 0,
                  description: '0 = no, 1 = yes',
                },
                address: {
                  type: 'object',
                  nullable: true,
                  description: 'Participant address',
                },
              },
            },
            user: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: 'f316a86c-2909-4d32-8983-eb225c715bcb',
                  description: 'User UUID',
                },
                firstName: {
                  type: 'string',
                  example: 'John',
                },
                lastName: {
                  type: 'string',
                  nullable: true,
                  example: 'Doe',
                },
                email: {
                  type: 'string',
                  example: 'user@example.com',
                },
                mobile: {
                  type: 'string',
                  nullable: true,
                  example: '9876543210',
                },
                profileImage: {
                  type: 'string',
                  format: 'uri',
                  nullable: true,
                  example: 'https://bucket.s3.region.amazonaws.com/user-profile.jpg',
                },
              },
            },
            batches: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  batch: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        example: '507f1f77bcf86cd799439011',
                      },
                      name: {
                        type: 'string',
                        example: 'Morning Batch',
                      },
                      scheduled: {
                        type: 'object',
                        properties: {
                          start_date: {
                            type: 'string',
                            format: 'date',
                            example: '2024-01-15',
                          },
                          start_time: {
                            type: 'string',
                            example: '09:00',
                          },
                          end_time: {
                            type: 'string',
                            example: '11:00',
                          },
                          training_days: {
                            type: 'array',
                            items: {
                              type: 'string',
                            },
                            example: ['monday', 'wednesday', 'friday'],
                          },
                        },
                      },
                      duration: {
                        type: 'object',
                        properties: {
                          count: {
                            type: 'number',
                            example: 3,
                          },
                          type: {
                            type: 'string',
                            example: 'month',
                          },
                        },
                      },
                      capacity: {
                        type: 'object',
                        properties: {
                          min: {
                            type: 'number',
                            example: 10,
                          },
                          max: {
                            type: 'number',
                            nullable: true,
                            example: 30,
                          },
                        },
                      },
                      age: {
                        type: 'object',
                        properties: {
                          min: {
                            type: 'number',
                            example: 8,
                          },
                          max: {
                            type: 'number',
                            example: 16,
                          },
                        },
                      },
                      admission_fee: {
                        type: 'number',
                        nullable: true,
                        example: 5000,
                      },
                      fee_structure: {
                        type: 'object',
                        nullable: true,
                        additionalProperties: true,
                      },
                      status: {
                        type: 'string',
                        example: 'published',
                      },
                    },
                  },
                  sport: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        example: '507f1f77bcf86cd799439011',
                      },
                      name: {
                        type: 'string',
                        example: 'Cricket',
                      },
                      logo: {
                        type: 'string',
                        format: 'uri',
                        nullable: true,
                        example: 'https://bucket.s3.region.amazonaws.com/sports/cricket.png',
                      },
                    },
                  },
                  center: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        example: '507f1f77bcf86cd799439011',
                      },
                      center_name: {
                        type: 'string',
                        example: 'Elite Sports Academy',
                      },
                      email: {
                        type: 'string',
                        nullable: true,
                        example: 'info@elitesportsacademy.com',
                      },
                      mobile_number: {
                        type: 'string',
                        nullable: true,
                        example: '9876543210',
                      },
                      logo: {
                        type: 'string',
                        format: 'uri',
                        nullable: true,
                        example: 'https://bucket.s3.region.amazonaws.com/logos/elite-academy.png',
                      },
                      location: {
                        type: 'object',
                        nullable: true,
                        properties: {
                          latitude: {
                            type: 'number',
                            example: 28.6139,
                          },
                          longitude: {
                            type: 'number',
                            example: 77.209,
                          },
                          address: {
                            type: 'object',
                            properties: {
                              line1: { type: 'string', nullable: true },
                              line2: { type: 'string' },
                              city: { type: 'string' },
                              state: { type: 'string' },
                              country: { type: 'string', nullable: true },
                              pincode: { type: 'string' },
                            },
                          },
                        },
                      },
                    },
                  },
                  booking: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        example: 'f316a86c-2909-4d32-8983-eb225c715bcb',
                      },
                      status: {
                        type: 'string',
                        enum: ['pending', 'confirmed', 'cancelled', 'completed'],
                        example: 'confirmed',
                      },
                      payment: {
                        type: 'object',
                        properties: {
                          status: {
                            type: 'string',
                            enum: ['pending', 'processing', 'success', 'failed', 'refunded', 'cancelled'],
                            example: 'success',
                          },
                          amount: {
                            type: 'number',
                            example: 5000,
                          },
                          currency: {
                            type: 'string',
                            example: 'INR',
                          },
                          payment_method: {
                            type: 'string',
                            nullable: true,
                            example: 'card',
                          },
                          paid_at: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                            example: '2024-01-15T10:30:00.000Z',
                          },
                        },
                      },
                      amount: {
                        type: 'number',
                        example: 5000,
                      },
                      currency: {
                        type: 'string',
                        example: 'INR',
                      },
                      notes: {
                        type: 'string',
                        nullable: true,
                        example: 'Special requirements noted',
                      },
                      createdAt: {
                        type: 'string',
                        format: 'date-time',
                        example: '2024-01-15T10:30:00.000Z',
                      },
                      updatedAt: {
                        type: 'string',
                        format: 'date-time',
                        example: '2024-01-15T10:30:00.000Z',
                      },
                    },
                  },
                  enrolledDate: {
                    type: 'string',
                    format: 'date-time',
                    example: '2024-01-15T10:30:00.000Z',
                  },
                },
              },
              description: 'All batches the student is enrolled in with complete details',
            },
            overallStatus: {
              type: 'string',
              enum: ['active', 'left', 'completed', 'pending'],
              example: 'active',
              description: 'Overall status based on batch enrollments',
            },
            totalEnrollments: {
              type: 'number',
              example: 2,
              description: 'Total number of batch enrollments',
            },
            activeEnrollments: {
              type: 'number',
              example: 1,
              description: 'Number of active (confirmed) enrollments',
            },
          },
        },
      },
      Settings: {
        type: 'object',
        description: 'Application settings with flexible structure for future extensibility',
        properties: {
          _id: {
            type: 'string',
            example: '507f1f77bcf86cd799439011',
            description: 'MongoDB Object ID',
          },
          app_name: {
            type: 'string',
            nullable: true,
            example: 'Play A Sport',
            description: 'Application name',
          },
          app_logo: {
            type: 'string',
            format: 'uri',
            nullable: true,
            example: 'https://example.com/logo.png',
            description: 'Application logo URL',
          },
          contact: {
            type: 'object',
            nullable: true,
            properties: {
              number: {
                type: 'array',
                items: {
                  type: 'string',
                },
                nullable: true,
                example: ['+91-9876543210', '+91-9876543211'],
                description: 'Array of contact numbers',
              },
              email: {
                type: 'string',
                format: 'email',
                nullable: true,
                example: 'contact@playasport.in',
                description: 'Contact email address',
              },
              address: {
                type: 'object',
                nullable: true,
                properties: {
                  office: {
                    type: 'string',
                    nullable: true,
                    example: '123 Main Street, Kolkata',
                    description: 'Office address',
                  },
                  registered: {
                    type: 'string',
                    nullable: true,
                    example: '456 Corporate Avenue, Mumbai',
                    description: 'Registered address',
                  },
                },
              },
              whatsapp: {
                type: 'string',
                nullable: true,
                example: '+91-9876543210',
                description: 'WhatsApp contact number',
              },
              instagram: {
                type: 'string',
                format: 'uri',
                nullable: true,
                example: 'https://instagram.com/playasport',
                description: 'Instagram profile URL',
              },
              facebook: {
                type: 'string',
                format: 'uri',
                nullable: true,
                example: 'https://facebook.com/playasport',
                description: 'Facebook page URL',
              },
              youtube: {
                type: 'string',
                format: 'uri',
                nullable: true,
                example: 'https://youtube.com/playasport',
                description: 'YouTube channel URL',
              },
            },
          },
          basic_info: {
            type: 'object',
            nullable: true,
            description: 'Extended basic information',
            properties: {
              about_us: { type: 'string', nullable: true, example: 'About our platform...' },
              support_email: { type: 'string', format: 'email', nullable: true, example: 'support@playasport.in' },
              support_phone: { type: 'string', nullable: true, example: '+91-9876543210' },
              meta_description: { type: 'string', nullable: true, example: 'Meta description for SEO' },
              meta_keywords: { type: 'string', nullable: true, example: 'sports, coaching, academy' },
            },
          },
          fees: {
            type: 'object',
            nullable: true,
            description: 'Fee configuration',
            properties: {
              platform_fee: { type: 'number', nullable: true, example: 200, description: 'Platform fee amount' },
              gst_percentage: { type: 'number', nullable: true, example: 18, description: 'GST percentage' },
              gst_enabled: { type: 'boolean', nullable: true, example: true, description: 'Whether GST is enabled' },
              currency: { type: 'string', nullable: true, example: 'INR', description: 'Currency code' },
            },
          },
          notifications: {
            type: 'object',
            nullable: true,
            description: 'Notification configuration (sensitive fields excluded in public endpoints)',
            properties: {
              enabled: { type: 'boolean', nullable: true, example: true },
              sms: {
                type: 'object',
                nullable: true,
                properties: {
                  enabled: { type: 'boolean', nullable: true, example: true },
                  provider: { type: 'string', nullable: true, example: 'twilio' },
                  from_number: { type: 'string', nullable: true, example: '+1234567890' },
                  sender_id: { type: 'string', nullable: true },
                },
              },
              email: {
                type: 'object',
                nullable: true,
                properties: {
                  enabled: { type: 'boolean', nullable: true, example: true },
                  host: { type: 'string', nullable: true, example: 'smtp.gmail.com' },
                  port: { type: 'number', nullable: true, example: 587 },
                  from: { type: 'string', nullable: true, example: 'noreply@playasport.in' },
                  from_name: { type: 'string', nullable: true, example: 'PlayAsport' },
                  secure: { type: 'boolean', nullable: true, example: false },
                },
              },
              whatsapp: {
                type: 'object',
                nullable: true,
                properties: {
                  enabled: { type: 'boolean', nullable: true, example: true },
                  provider: { type: 'string', nullable: true, example: 'twilio' },
                  from_number: { type: 'string', nullable: true, example: '+1234567890' },
                },
              },
              push: {
                type: 'object',
                nullable: true,
                properties: {
                  enabled: { type: 'boolean', nullable: true, example: true },
                },
              },
            },
          },
          payment: {
            type: 'object',
            nullable: true,
            description: 'Payment configuration (sensitive fields excluded in public endpoints)',
            properties: {
              enabled: { type: 'boolean', nullable: true, example: true, description: 'Whether payment gateway is enabled' },
              gateway: { type: 'string', nullable: true, example: 'razorpay', enum: ['razorpay', 'stripe', 'payu', 'cashfree'] },
              razorpay: {
                type: 'object',
                nullable: true,
                properties: {
                  enabled: { type: 'boolean', nullable: true, example: true },
                },
              },
              stripe: {
                type: 'object',
                nullable: true,
                properties: {
                  enabled: { type: 'boolean', nullable: true, example: false },
                },
              },
            },
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T00:00:00.000Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T00:00:00.000Z',
          },
        },
        // Admin Panel Schemas
        AdminLoginResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Login successful',
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', example: 'user-id-123' },
                    email: { type: 'string', example: 'admin@example.com' },
                    firstName: { type: 'string', example: 'John' },
                    lastName: { type: 'string', example: 'Doe' },
                    roles: {
                      type: 'array',
                      items: { type: 'string' },
                      example: ['super_admin'],
                    },
                  },
                },
                accessToken: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                },
                refreshToken: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                },
              },
            },
          },
        },
        AdminProfileResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Profile retrieved successfully',
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User',
                },
              },
            },
          },
        },
        AdminUpdateProfileRequest: {
          type: 'object',
          properties: {
            firstName: {
              type: 'string',
              example: 'John',
            },
            lastName: {
              type: 'string',
              example: 'Doe',
            },
            mobile: {
              type: 'string',
              pattern: '^[6-9]\\d{9}$',
              example: '9876543210',
            },
          },
        },
        AdminChangePasswordRequest: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: {
              type: 'string',
              format: 'password',
              example: 'Current@123',
            },
            newPassword: {
              type: 'string',
              format: 'password',
              minLength: 8,
              example: 'New@123456',
              description: 'Must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character',
            },
          },
        },
        Permission: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            role: {
              $ref: '#/components/schemas/Role',
            },
            section: {
              type: 'string',
              enum: [
                'coaching_center',
                'employee',
                'batch',
                'booking',
                'student',
                'participant',
                'fee_type_config',
                'sport',
                'facility',
                'location',
                'settings',
                'reel',
                'role',
                'user',
                'academy_auth',
                'user_auth',
                'permission',
                'dashboard',
              ],
              example: 'coaching_center',
            },
            actions: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['view', 'create', 'update', 'delete'],
              },
              example: ['view', 'create', 'update'],
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        PermissionsResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Permissions retrieved successfully',
            },
            data: {
              type: 'object',
              properties: {
                permissions: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Permission',
                  },
                },
              },
            },
          },
        },
        CreatePermissionRequest: {
          type: 'object',
          required: ['role', 'section', 'actions'],
          properties: {
            role: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
              description: 'Role ID (MongoDB ObjectId)',
            },
            section: {
              type: 'string',
              enum: [
                'coaching_center',
                'employee',
                'batch',
                'booking',
                'student',
                'participant',
                'fee_type_config',
                'sport',
                'facility',
                'location',
                'settings',
                'reel',
                'role',
                'user',
                'academy_auth',
                'user_auth',
                'permission',
                'dashboard',
              ],
              example: 'coaching_center',
            },
            actions: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['view', 'create', 'update', 'delete'],
              },
              minItems: 1,
              example: ['view', 'create', 'update'],
            },
            isActive: {
              type: 'boolean',
              default: true,
              example: true,
            },
          },
        },
        UpdatePermissionRequest: {
          type: 'object',
          properties: {
            section: {
              type: 'string',
              enum: [
                'coaching_center',
                'employee',
                'batch',
                'booking',
                'student',
                'participant',
                'fee_type_config',
                'sport',
                'facility',
                'location',
                'settings',
                'reel',
                'role',
                'user',
                'academy_auth',
                'user_auth',
                'permission',
                'dashboard',
              ],
            },
            actions: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['view', 'create', 'update', 'delete'],
              },
              minItems: 1,
            },
            isActive: {
              type: 'boolean',
            },
          },
        },
        BulkUpdatePermissionsRequest: {
          type: 'object',
          required: ['role', 'permissions'],
          properties: {
            role: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
              description: 'Role ID (MongoDB ObjectId)',
            },
            permissions: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['section', 'actions'],
                properties: {
                  section: {
                    type: 'string',
                    enum: [
                      'coaching_center',
                      'employee',
                      'batch',
                      'booking',
                      'student',
                      'participant',
                      'fee_type_config',
                      'sport',
                      'facility',
                      'location',
                      'settings',
                      'reel',
                      'role',
                      'user',
                      'academy_auth',
                      'user_auth',
                      'permission',
                      'dashboard',
                    ],
                  },
                  actions: {
                    type: 'array',
                    items: {
                      type: 'string',
                      enum: ['view', 'create', 'update', 'delete'],
                    },
                    minItems: 1,
                  },
                  isActive: {
                    type: 'boolean',
                    default: true,
                  },
                },
              },
            },
          },
        },
        SectionsResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Sections retrieved successfully',
            },
            data: {
              type: 'object',
              properties: {
                sections: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      value: { type: 'string', example: 'coaching_center' },
                      label: { type: 'string', example: 'Coaching Center' },
                    },
                  },
                },
              },
            },
          },
        },
        ActionsResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Actions retrieved successfully',
            },
            data: {
              type: 'object',
              properties: {
                actions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      value: { type: 'string', example: 'view' },
                      label: { type: 'string', example: 'View' },
                    },
                  },
                },
              },
            },
          },
        },
        DashboardStatsResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Statistics retrieved successfully',
            },
            data: {
              type: 'object',
              properties: {
                stats: {
                  type: 'object',
                  properties: {
                    users: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer', example: 1000 },
                        active: { type: 'integer', example: 950 },
                        inactive: { type: 'integer', example: 50 },
                      },
                    },
                    coachingCenters: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer', example: 150 },
                        active: { type: 'integer', example: 140 },
                        inactive: { type: 'integer', example: 10 },
                      },
                    },
                    bookings: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer', example: 500 },
                        pending: { type: 'integer', example: 50 },
                        completed: { type: 'integer', example: 450 },
                      },
                    },
                    batches: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer', example: 200 },
                        active: { type: 'integer', example: 180 },
                        inactive: { type: 'integer', example: 20 },
                      },
                    },
                    employees: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer', example: 300 },
                        active: { type: 'integer', example: 280 },
                        inactive: { type: 'integer', example: 20 },
                      },
                    },
                    students: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer', example: 800 },
                      },
                    },
                    participants: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer', example: 1200 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        CreateAdminUserRequest: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'roles'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'newuser@example.com',
              description: 'User email address (must be unique)',
            },
            password: {
              type: 'string',
              format: 'password',
              minLength: 8,
              example: 'SecurePass@123',
              description: 'Password must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character',
            },
            firstName: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              example: 'John',
            },
            lastName: {
              type: 'string',
              maxLength: 100,
              nullable: true,
              example: 'Doe',
            },
            mobile: {
              type: 'string',
              pattern: '^[6-9]\\d{9}$',
              nullable: true,
              example: '9876543210',
              description: 'Indian mobile number (10 digits starting with 6-9)',
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other'],
              nullable: true,
              example: 'male',
            },
            dob: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '1990-01-01T00:00:00.000Z',
            },
            roles: {
              type: 'array',
              items: {
                type: 'string',
              },
              minItems: 1,
              example: ['user'],
              description: 'Array of role names (e.g., ["user", "admin"])',
            },
            userType: {
              type: 'string',
              enum: ['student', 'guardian'],
              nullable: true,
              example: 'student',
              description: 'Only applies when role includes "user"',
            },
            isActive: {
              type: 'boolean',
              default: true,
              example: true,
            },
            address: {
              type: 'object',
              nullable: true,
              properties: {
                line1: {
                  type: 'string',
                  maxLength: 255,
                },
                line2: {
                  type: 'string',
                  maxLength: 255,
                },
                area: {
                  type: 'string',
                  maxLength: 255,
                },
                city: {
                  type: 'string',
                },
                state: {
                  type: 'string',
                },
                country: {
                  type: 'string',
                },
                pincode: {
                  type: 'string',
                  pattern: '^\\d{6}$',
                },
              },
            },
          },
        },
        UpdateAdminUserRequest: {
          type: 'object',
          description: 'All fields are optional. Roles can be updated by providing an array of role names.',
          properties: {
            firstName: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              example: 'John',
            },
            lastName: {
              type: 'string',
              maxLength: 100,
              nullable: true,
              example: 'Doe',
            },
            mobile: {
              type: 'string',
              pattern: '^[6-9]\\d{9}$',
              nullable: true,
              example: '9876543210',
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other'],
              nullable: true,
              example: 'male',
            },
            dob: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '1990-01-01T00:00:00.000Z',
            },
            roles: {
              type: 'array',
              items: {
                type: 'string',
              },
              minItems: 1,
              example: ['user', 'admin'],
              description: 'Array of role names to assign to user',
            },
            userType: {
              type: 'string',
              enum: ['student', 'guardian'],
              nullable: true,
              example: 'student',
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
            address: {
              type: 'object',
              nullable: true,
              properties: {
                line1: {
                  type: 'string',
                  maxLength: 255,
                },
                line2: {
                  type: 'string',
                  maxLength: 255,
                },
                area: {
                  type: 'string',
                  maxLength: 255,
                },
                city: {
                  type: 'string',
                },
                state: {
                  type: 'string',
                },
                country: {
                  type: 'string',
                },
                pincode: {
                  type: 'string',
                  pattern: '^\\d{6}$',
                },
              },
            },
          },
        },
        Role: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            name: {
              type: 'string',
              example: 'admin',
            },
            description: {
              type: 'string',
              example: 'Administrator with elevated permissions',
              nullable: true,
            },
            visibleToRoles: {
              type: 'array',
              items: {
                type: 'string',
              },
              nullable: true,
              example: ['super_admin', 'admin'],
              description: 'Array of role names that can view this role. If null, only SUPER_ADMIN and ADMIN can view it.',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        CreateRoleRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 50,
              pattern: '^[a-z_]+$',
              example: 'manager',
              description: 'Role name must be lowercase with underscores only (e.g., "new_role"). Cannot be a default system role.',
            },
            description: {
              type: 'string',
              maxLength: 500,
              nullable: true,
              example: 'Manager role with management permissions',
            },
            visibleToRoles: {
              type: 'array',
              items: {
                type: 'string',
              },
              nullable: true,
              example: ['super_admin', 'admin'],
              description: 'Array of role names that can view this role. If null or empty, only SUPER_ADMIN and ADMIN can view it.',
            },
          },
        },
        UpdateRoleRequest: {
          type: 'object',
          description: 'All fields are optional. For default roles, only description and visibleToRoles can be updated.',
          properties: {
            description: {
              type: 'string',
              maxLength: 500,
              nullable: true,
              example: 'Updated description',
            },
            visibleToRoles: {
              type: 'array',
              items: {
                type: 'string',
              },
              nullable: true,
              example: ['super_admin', 'admin', 'academy'],
              description: 'Array of role names that can view this role. If null or empty, only SUPER_ADMIN and ADMIN can view it.',
            },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'f316a86c-2909-4d32-8983-eb225c715bcb',
              description: 'Notification UUID',
            },
            recipientType: {
              type: 'string',
              enum: ['user', 'academy'],
              example: 'user',
              description: 'Type of recipient',
            },
            recipientId: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
              description: 'Recipient ObjectId (User or Academy owner)',
            },
            title: {
              type: 'string',
              example: 'New Booking Confirmed',
              description: 'Notification title',
            },
            body: {
              type: 'string',
              example: 'Your booking for Cricket Batch has been confirmed.',
              description: 'Notification body/message',
            },
            channels: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['sms', 'email', 'whatsapp', 'push'],
              },
              example: ['push', 'email'],
              description: 'Channels through which notification was sent',
            },
            priority: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
              example: 'medium',
              description: 'Notification priority',
            },
            data: {
              type: 'object',
              additionalProperties: true,
              nullable: true,
              example: {
                bookingId: 'BK-2024-0001',
                type: 'booking',
                batchId: 'batch-uuid-123',
                amount: 5000,
              },
              description: 'Additional data for push notifications (values can be any JSON-serializable type: string, number, boolean, object, array)',
            },
            imageUrl: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://bucket.s3.region.amazonaws.com/notifications/image.png',
              description: 'Image URL for push notifications (optional, can be null)',
            },
            isRead: {
              type: 'boolean',
              example: false,
              description: 'Whether notification has been read',
            },
            readAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2024-01-15T10:30:00.000Z',
              description: 'Timestamp when notification was read',
            },
            sent: {
              type: 'boolean',
              example: true,
              description: 'Whether notification was successfully sent',
            },
            sentAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2024-01-15T10:00:00.000Z',
              description: 'Timestamp when notification was sent',
            },
            error: {
              type: 'string',
              nullable: true,
              example: null,
              description: 'Error message if sending failed',
            },
            metadata: {
              type: 'object',
              additionalProperties: true,
              nullable: true,
              example: {
                source: 'admin_panel',
                adminId: 'admin-uuid-123',
              },
              description: 'Additional metadata',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:00:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:00:00.000Z',
            },
          },
        },
        NotificationListResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Notifications retrieved successfully',
            },
            data: {
              type: 'object',
              properties: {
                notifications: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Notification',
                  },
                },
                pagination: {
                  $ref: '#/components/schemas/Pagination',
                },
                unreadCount: {
                  type: 'number',
                  example: 5,
                  description: 'Total count of unread notifications',
                },
              },
            },
          },
        },
        SendNotificationRequest: {
          type: 'object',
          required: ['recipientType', 'recipientId', 'title', 'body'],
          properties: {
            recipientType: {
              type: 'string',
              enum: ['user', 'academy'],
              example: 'user',
              description: 'Type of recipient',
            },
            recipientId: {
              type: 'string',
              example: 'user-uuid-here',
              description: 'User ID or Academy ID (custom string ID)',
            },
            title: {
              type: 'string',
              minLength: 1,
              maxLength: 200,
              example: 'New Booking Confirmed',
              description: 'Notification title',
            },
            body: {
              type: 'string',
              minLength: 1,
              maxLength: 1000,
              example: 'Your booking for Cricket Batch has been confirmed.',
              description: 'Notification body/message',
            },
            channels: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['sms', 'email', 'whatsapp', 'push'],
              },
              minItems: 1,
              default: ['push'],
              example: ['push', 'email'],
              description: 'Channels to send notification through',
            },
            priority: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
              default: 'medium',
              example: 'medium',
              description: 'Notification priority',
            },
            data: {
              type: 'object',
              additionalProperties: true,
              nullable: true,
              example: { bookingId: 'BK-2024-0001', type: 'booking' },
              description: 'Additional data for push notifications',
            },
            imageUrl: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://bucket.s3.region.amazonaws.com/notifications/image.png',
              description: 'Image URL for push notifications (optional, can be null)',
            },
            metadata: {
              type: 'object',
              additionalProperties: true,
              nullable: true,
              example: {
                customField: 'custom-value',
              },
              description: 'Additional metadata (optional). Note: source and adminId are automatically populated from authenticated admin user.',
            },
          },
        },
        TestNotificationRequest: {
          type: 'object',
          required: ['recipientType', 'recipientId'],
          properties: {
            recipientType: {
              type: 'string',
              enum: ['user', 'academy'],
              example: 'user',
              description: 'Type of recipient',
            },
            recipientId: {
              type: 'string',
              example: 'user-uuid-here',
              description: 'User ID or Academy ID (custom string ID)',
            },
            channels: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['sms', 'email', 'whatsapp', 'push'],
              },
              minItems: 1,
              default: ['push'],
              example: ['push', 'email'],
              description: 'Channels to test',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Academy Auth',
        description: 'Academy user authentication endpoints',
      },
      {
        name: 'User Auth',
        description: 'User (student/guardian) authentication endpoints',
      },
      {
        name: 'Participant',
        description: 'Participant management endpoints for users',
      },
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
      {
        name: 'Locale',
        description: 'Locale management endpoints',
      },
      {
        name: 'Location',
        description: 'Location endpoints for countries, states, and cities',
      },
      {
        name: 'Sport',
        description: 'Sport endpoints for retrieving sports data',
      },
      {
        name: 'Coaching Center',
        description: 'Coaching center management endpoints',
      },
      {
        name: 'Coaching Center Media',
        description: 'Coaching center media upload endpoints',
      },
      {
        name: 'Basic',
        description: 'Basic endpoints for sports and facilities lists',
      },
      {
        name: 'Employee',
        description: 'Employee management endpoints',
      },
      {
        name: 'Employee Media',
        description: 'Employee certification file upload endpoints',
      },
      {
        name: 'Role',
        description: 'Role management endpoints',
      },
      {
        name: 'Batch',
        description: 'Batch management endpoints',
      },
      {
        name: 'Fee Type',
        description: 'Fee type configuration endpoints for dynamic form generation',
      },
      {
        name: 'Booking',
        description: 'User booking and payment management endpoints',
      },
      {
        name: 'Academy Booking',
        description: 'Academy booking management endpoints for viewing and managing bookings',
      },
      {
        name: 'Academy Student',
        description: 'Academy student management endpoints for viewing enrolled students',
      },
      {
        name: 'Webhook',
        description: 'Webhook endpoints for payment verification',
      },
      {
        name: 'Settings',
        description: 'Application settings management endpoints',
      },
      {
        name: 'Academy',
        description: 'Public academy endpoints for browsing and searching academies',
      },
      {
        name: 'Home',
        description: 'Home page data endpoints',
      },
      {
        name: 'Admin Auth',
        description: 'Admin panel authentication endpoints for Super Admin, Admin, Employee, and Agent roles',
      },
      {
        name: 'Admin Permissions',
        description: 'Permission management endpoints for role-based access control (Super Admin only for create/update/delete)',
      },
      {
        name: 'Admin Dashboard',
        description: 'Admin dashboard statistics and analytics endpoints',
      },
      {
        name: 'Admin Coaching Centers',
        description: 'Admin panel coaching center management endpoints with permission-based access',
      },
      {
        name: 'Admin Users',
        description: 'Admin panel user management endpoints with permission-based access',
      },
      {
        name: 'Admin Roles',
        description: 'Admin panel role management endpoints (Super Admin only for create/update/delete)',
      },
      {
        name: 'Admin Batches',
        description: 'Admin panel batch management endpoints with permission-based access',
      },
      {
        name: 'Admin Sports',
        description: 'Admin panel sport management endpoints (Super Admin only for create/update/delete)',
      },
      {
        name: 'Admin Bookings',
        description: 'Admin panel booking management endpoints with permission-based access control',
      },
      {
        name: 'Admin Transactions',
        description: 'Admin panel transaction management endpoints for viewing and managing all financial transactions with permission-based access control',
      },
      {
        name: 'Admin Payments',
        description: 'Admin panel payment management endpoints for viewing and managing payment transactions specifically with permission-based access control',
      },
      {
        name: 'Admin Banners',
        description: 'Admin panel banner management endpoints for creating, updating, and managing promotional banners with advanced features like scheduling, positioning, and targeting',
      },
      {
        name: 'Admin CMS Pages',
        description: 'Admin panel CMS page management endpoints for creating, updating, and managing content pages like privacy policy, terms and conditions, etc.',
      },
      {
        name: 'Banners',
        description: 'Public banner endpoints for users to fetch active banners by position with filtering options',
      },
      {
        name: 'CMS Pages',
        description: 'Public CMS page endpoints for users to access content pages like privacy policy, terms and conditions, etc.',
      },
      {
        name: 'Academy Banners',
        description: 'Banner endpoints for coaching centers to view banners displayed on their center pages',
      },
      {
        name: 'Admin Notifications',
        description: 'Admin panel notification management endpoints for sending notifications to users and academies',
      },
      {
        name: 'Admin Settings',
        description: 'Admin panel settings management endpoints for managing application settings including fees, notifications, payment, and basic information (includes sensitive data)',
      },
      {
        name: 'Admin Highlights',
        description: 'Admin panel highlight management endpoints for creating, updating, and managing video highlights with video processing in background',
      },
      {
        name: 'Admin Facilities',
        description: 'Admin panel facility management endpoints for creating, updating, and managing facilities with pagination, filtering, and search',
      },
      {
        name: 'Admin Locations',
        description: 'Admin panel location management endpoints for creating, updating, and managing countries, states, and cities with pagination, filtering, and search',
      },
      {
        name: 'Admin Queues',
        description: 'Admin panel queue management endpoints for viewing and managing background job queues (thumbnail generation, video processing) and viewing logs',
      },
      {
        name: 'User Notifications',
        description: 'User notification endpoints for viewing and managing notifications',
      },
      {
        name: 'Academy Notifications',
        description: 'Academy notification endpoints for viewing and managing notifications',
      },
    ],
    'x-tagGroups': [
      {
        name: 'Authentication & Authorization',
        tags: ['Academy Auth', 'User Auth'],
      },
      {
        name: 'Academy Management',
        tags: [
          'Coaching Center',
          'Coaching Center Media',
          'Employee',
          'Employee Media',
          'Batch',
          'Fee Type',
          'Academy Booking',
          'Academy Student',
          'Academy Banners',
        ],
      },
      {
        name: 'User Management',
        tags: ['Participant', 'Booking'],
      },
      {
        name: 'Public Endpoints',
        tags: ['Academy', 'Home', 'Basic', 'Location', 'Sport', 'Reels', 'Banners', 'CMS Pages'],
      },
      {
        name: 'System & Utilities',
        tags: ['Role', 'Locale', 'Health', 'Webhook', 'Settings'],
      },
      {
        name: 'Admin Panel',
        tags: [
          'Admin Auth',
          'Admin Permissions',
          'Admin Dashboard',
          'Admin Coaching Centers',
          'Admin Users',
          'Admin Roles',
          'Admin Batches',
          'Admin Bookings',
          'Admin Transactions',
          'Admin Payments',
          'Admin Banners',
          'Admin CMS Pages',
          'Admin Notifications',
          'Admin Settings',
          'Admin Highlights',
          'Admin Reels',
          'Admin Facilities',
          'Admin Locations',
          'Admin Queues',
        ],
      },
      {
        name: 'Notifications',
        tags: ['User Notifications', 'Academy Notifications'],
      },
    ],
  },
  apis: [
    path.join(process.cwd(), 'src/routes/**/*.ts'),
    path.join(process.cwd(), 'src/controllers/**/*.ts'),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);



