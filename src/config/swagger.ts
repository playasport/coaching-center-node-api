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
            role: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: 'student',
                },
                name: {
                  type: 'string',
                  example: 'student',
                },
              },
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
                  description: 'JWT refresh token (long-lived, 7 days)',
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
                  description: 'New JWT refresh token (long-lived, 7 days)',
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
                  example: '123456',
                },
                mode: {
                  type: 'string',
                  enum: ['login', 'register', 'profile_update', 'forgot_password'],
                  example: 'register',
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
              example: '123456',
              description: 'OTP received on mobile via /academy/auth/send-otp (mode: register)',
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
                token: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
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
              example: '123456',
            },
            newPassword: {
              type: 'string',
              example: 'StrongPass@123',
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
          },
          example: {
            provider: 'google',
            idToken: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjUxOG...',
            firstName: 'John',
            lastName: 'Doe',
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
          required: ['firstName', 'email', 'password', 'mobile', 'role', 'dob', 'gender', 'otp'],
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
            password: {
              type: 'string',
              minLength: 8,
              example: 'StrongPass@123',
            },
            mobile: {
              type: 'string',
              example: '9876543210',
              description: 'User mobile number used for OTP verification',
            },
            role: {
              type: 'string',
              enum: ['student', 'guardian'],
              example: 'student',
              description: 'User role - either student or guardian',
            },
            dob: {
              type: 'string',
              format: 'date',
              example: '2000-01-15',
              description: 'Date of birth in YYYY-MM-DD format (age must be at least 3 years)',
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other'],
              example: 'male',
            },
            otp: {
              type: 'string',
              example: '123456',
              description: 'OTP received on mobile via /user/auth/send-otp (mode: register)',
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
            role: {
              type: 'string',
              enum: ['student', 'guardian'],
              example: 'student',
              description: 'User role - defaults to student if not provided',
            },
          },
          example: {
            provider: 'google',
            idToken: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjUxOG...',
            firstName: 'John',
            lastName: 'Doe',
            role: 'student',
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
            code: { type: 'string', example: 'IN' },
            iso2: { type: 'string', example: 'IN' },
            iso3: { type: 'string', example: 'IND' },
            phoneCode: { type: 'string', example: '+91' },
            currency: { type: 'string', example: 'INR' },
            currencySymbol: { type: 'string', example: '₹' },
            region: { type: 'string', example: 'Asia' },
            subregion: { type: 'string', example: 'Southern Asia' },
            latitude: { type: 'number', example: 20.5937 },
            longitude: { type: 'number', example: 78.9629 },
          },
        },
        State: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439012' },
            name: { type: 'string', example: 'Delhi' },
            countryId: { type: 'string', example: '507f1f77bcf86cd799439011' },
            countryCode: { type: 'string', example: 'IN' },
            countryName: { type: 'string', example: 'India' },
            stateCode: { type: 'string', example: 'DL' },
            latitude: { type: 'number', example: 28.6139 },
            longitude: { type: 'number', example: 77.209 },
          },
        },
        City: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439013' },
            name: { type: 'string', example: 'New Delhi' },
            stateId: { type: 'string', example: '507f1f77bcf86cd799439012' },
            stateName: { type: 'string', example: 'Delhi' },
            stateCode: { type: 'string', example: 'DL' },
            countryId: { type: 'string', example: '507f1f77bcf86cd799439011' },
            countryCode: { type: 'string', example: 'IN' },
            countryName: { type: 'string', example: 'India' },
            latitude: { type: 'number', example: 28.6139 },
            longitude: { type: 'number', example: 77.209 },
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
          ],
          properties: {
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
          },
        },
        CoachingCenterUpdateRequest: {
          type: 'object',
          description: 'Update coaching center request. All fields are optional. If status is set to "published", all required fields must be present (either from existing data or in this update).',
          properties: {
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
    ],
  },
  apis: [
    path.join(process.cwd(), 'src/routes/**/*.ts'),
    path.join(process.cwd(), 'src/controllers/**/*.ts'),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);



