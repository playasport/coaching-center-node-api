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
              example: 'male',
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
          required: ['firstName', 'email', 'password', 'isVerified'],
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
              minLength: 6,
              example: 'strongPassword123',
            },
            mobile: {
              type: 'string',
              example: '9876543210',
              description: 'Academy administrator mobile number used for OTP verification',
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other'],
              example: 'female',
            },
            isVerified: {
              type: 'boolean',
              example: true,
              description:
                'Set to true after successfully verifying the mobile OTP via /academy/auth/verify-otp',
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
            email: {
              type: 'string',
              format: 'email',
              example: 'academy.updated@example.com',
            },
            mobile: {
              type: 'string',
              example: '9876501234',
            },
            mobileOtp: {
              type: 'string',
              example: '123456',
              description: 'Required when updating the mobile number.',
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other'],
              example: 'male',
            },
            address: {
              type: 'object',
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
    ],
  },
  apis: ['./src/routes/**/*.ts', './src/controllers/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);


