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
                  enum: ['login', 'register'],
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
          required: ['firstName', 'email', 'password'],
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
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other'],
              example: 'female',
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
              enum: ['login', 'register'],
              example: 'register',
              description: 'Purpose of OTP. Defaults to login when omitted.',
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
              enum: ['login', 'register'],
              example: 'login',
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


