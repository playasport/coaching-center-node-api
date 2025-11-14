import swaggerJsdoc from 'swagger-jsdoc';
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
              example: 'academy@example.com',
            },
            mobile: {
              type: 'string',
              example: '9876543210',
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other'],
              example: 'male',
            },
            profileImage: {
              type: 'string',
              format: 'uri',
              example: 'https://bucket.s3.region.amazonaws.com/profile-images/user-id.jpg',
            },
            role: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: 'academy',
                },
                name: {
                  type: 'string',
                  example: 'academy',
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
                token: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                },
              },
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
      },
    },
    tags: [
      {
        name: 'Academy Auth',
        description: 'Academy user authentication endpoints',
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
    ],
  },
  apis: ['./src/routes/**/*.ts', './src/controllers/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);


