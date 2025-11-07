import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Coaching Center Panel API',
      version: '1.0.0',
      description: 'API documentation for Coaching Center Panel Node.js APIs with TypeScript, Express, Prisma, and MySQL',
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
        CoachingCentre: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '9b530377-2249-4828-af88-243244573689',
            },
            email: {
              type: 'string',
              example: 'coaching@example.com',
            },
            coachingName: {
              type: 'string',
              example: 'Star Warriors Coaching',
            },
            firstName: {
              type: 'string',
              example: 'John',
            },
            lastName: {
              type: 'string',
              example: 'Doe',
            },
            mobileNumber: {
              type: 'string',
              example: '1234567890',
            },
            isAdminApprove: {
              type: 'string',
              example: 'approved',
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
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'coachingName'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'coaching@example.com',
            },
            password: {
              type: 'string',
              minLength: 6,
              example: 'password123',
            },
            coachingName: {
              type: 'string',
              example: 'Star Warriors Coaching',
            },
            firstName: {
              type: 'string',
              example: 'John',
            },
            lastName: {
              type: 'string',
              example: 'Doe',
            },
            mobileNumber: {
              type: 'string',
              example: '1234567890',
            },
            contactEmail: {
              type: 'string',
              format: 'email',
              example: 'contact@example.com',
            },
            contactNumber: {
              type: 'string',
              example: '1234567890',
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'coaching@example.com',
            },
            password: {
              type: 'string',
              example: 'password123',
            },
          },
        },
        AuthResponse: {
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
                coachingCentre: {
                  $ref: '#/components/schemas/CoachingCentre',
                },
                token: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                },
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Auth',
        description: 'Authentication endpoints',
      },
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

