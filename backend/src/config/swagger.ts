import { Application } from 'express';
import swaggerUi from 'swagger-ui-express';

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'HOSPITALITY REST API',
    version: '1.0.0',
    description:
      'Holistic Optimization System for Policy-Integrated Admission & Treatment Intelligence — Non-AI Deterministic Core Backend'
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API Version 1'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your Bearer JWT token in the format: Bearer <token>'
      }
    },
    schemas: {
      StandardResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'object' },
          message: { type: 'string', example: 'Operation completed successfully' }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Request validation failed' },
              details: { type: 'array', items: { type: 'object' } }
            }
          }
        }
      }
    }
  },
  paths: {
    '/health': {
      get: {
        summary: 'System health check',
        tags: ['System'],
        responses: {
          '200': { description: 'Server and database status' }
        }
      }
    },
    '/auth/register': {
      post: {
        summary: 'Register new user account',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Rajesh Kumar' },
                  email: { type: 'string', example: 'rajesh@example.com' },
                  password: { type: 'string', example: 'Password123' },
                  role: { type: 'string', enum: ['user', 'admin'], example: 'user' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'User successfully created' },
          '409': { description: 'Duplicate email' },
          '422': { description: 'Validation error' }
        }
      }
    },
    '/auth/login': {
      post: {
        summary: 'User login',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'rajesh@example.com' },
                  password: { type: 'string', example: 'Password123' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Login successful with JWT' },
          '401': { description: 'Invalid credentials' }
        }
      }
    },
    '/auth/me': {
      get: {
        summary: 'Get current user profile',
        tags: ['Authentication'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'User profile details' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/policies': {
      post: {
        summary: 'Create an insurance policy',
        tags: ['Policies'],
        security: [{ BearerAuth: [] }],
        responses: {
          '201': { description: 'Policy created' }
        }
      },
      get: {
        summary: 'List user policies',
        tags: ['Policies'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'List of policies' }
        }
      }
    },
    '/policies/{id}': {
      get: {
        summary: 'Get policy by ID',
        tags: ['Policies'],
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Policy details' },
          '404': { description: 'Policy not found' }
        }
      },
      put: {
        summary: 'Update policy',
        tags: ['Policies'],
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Policy updated' }
        }
      },
      delete: {
        summary: 'Delete policy',
        tags: ['Policies'],
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Policy deleted' }
        }
      }
    },
    '/policies/{id}/confirm': {
      post: {
        summary: 'Confirm policy fields or mark verified',
        tags: ['Policies'],
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Policy confirmation state updated' }
        }
      }
    },
    '/policies/{id}/documents': {
      post: {
        summary: 'Upload PDF policy schedule or wording',
        tags: ['Documents'],
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          '201': { description: 'Document uploaded' }
        }
      },
      get: {
        summary: 'List documents for a policy',
        tags: ['Documents'],
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Document list' }
        }
      }
    },
    '/documents/{id}/download': {
      get: {
        summary: 'Download secure document binary stream',
        tags: ['Documents'],
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Binary PDF file stream' }
        }
      }
    },
    '/rules/evaluate': {
      post: {
        summary: 'Evaluate coverage, limits, exclusions and copays',
        tags: ['Rules Engine'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Coverage calculation result and decision trace' }
        }
      }
    },
    '/rules/proportionate-deduction': {
      post: {
        summary: 'Simulate IRDAI 2020 proportionate deduction with itemized audit',
        tags: ['Rules Engine'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Itemized proportionate audit results' }
        }
      }
    },
    '/rules/room-upgrade': {
      post: {
        summary: 'Simulate financial impact of room category upgrade',
        tags: ['Rules Engine'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Direct differential and cascaded out-of-pocket projection' }
        }
      }
    },
    '/waiting-periods/check': {
      post: {
        summary: 'Deterministic waiting-period and inception-date checker',
        tags: ['Waiting Periods'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Waiting period eligibility status' }
        }
      }
    },
    '/hospitals': {
      get: {
        summary: 'Search and filter hospital network directory',
        tags: ['Hospitals'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Hospital directory results' }
        }
      }
    },
    '/claims': {
      post: {
        summary: 'Initiate a new claim',
        tags: ['Claims'],
        security: [{ BearerAuth: [] }],
        responses: {
          '201': { description: 'Claim created in POLICY_CONFIRMED stage' }
        }
      },
      get: {
        summary: 'List user claims',
        tags: ['Claims'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Claims list' }
        }
      }
    },
    '/claims/{id}/status': {
      patch: {
        summary: 'Advance claim stage through the 12-stage lifecycle',
        tags: ['Claims'],
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Claim stage updated' }
        }
      }
    },
    '/bill-audits': {
      post: {
        summary: 'Submit structured hospital bill for deterministic error & duplicate audit',
        tags: ['Bill Audit'],
        security: [{ BearerAuth: [] }],
        responses: {
          '201': { description: 'Audit findings and deductions' }
        }
      }
    },
    '/rejections/record': {
      post: {
        summary: 'Record claim rejection or short-settlement details',
        tags: ['Rejection Explainer'],
        security: [{ BearerAuth: [] }],
        responses: {
          '201': { description: 'Deterministic classification and appeal plan' }
        }
      }
    },
    '/insurance/compare': {
      post: {
        summary: 'Multi-factor preference scoring and policy comparison',
        tags: ['Find Insurance'],
        responses: {
          '200': { description: 'Ranked policies with score breakdown' }
        }
      }
    },
    '/reviews': {
      post: {
        summary: 'Submit customer review with automatic verification badge',
        tags: ['Real Voices'],
        security: [{ BearerAuth: [] }],
        responses: {
          '201': { description: 'Review recorded' }
        }
      },
      get: {
        summary: 'List genuine customer reviews',
        tags: ['Real Voices'],
        responses: {
          '200': { description: 'Paginated reviews' }
        }
      }
    },
    '/reviews/stats': {
      get: {
        summary: 'Aggregate rating and category statistics',
        tags: ['Real Voices'],
        responses: {
          '200': { description: 'Aggregated stats or insufficient data notice' }
        }
      }
    },
    '/share-links': {
      post: {
        summary: 'Generate secure view-only link with cryptographic token',
        tags: ['Sharing'],
        security: [{ BearerAuth: [] }],
        responses: {
          '201': { description: 'Share link details' }
        }
      }
    },
    '/shared/{token}': {
      get: {
        summary: 'Public view-only access for shared token',
        tags: ['Sharing'],
        parameters: [{ in: 'path', name: 'token', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Sanitized resource details' },
          '410': { description: 'Token expired or revoked' }
        }
      }
    }
  }
};

export const setupSwagger = (app: Application): void => {
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api/v1/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};

