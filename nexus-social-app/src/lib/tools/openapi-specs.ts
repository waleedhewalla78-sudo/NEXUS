/**
 * Task 2: OpenAPI Spec Generation & Dify Registration
 * Provides the OpenAPI 3.0 schema definitions for Dify Custom Tools.
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://api.nexus-social.com';

export const nexusToolsOpenApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Nexus Social Backend Tools',
    version: '1.0.0',
    description: 'Internal API proxy tools to interact with orders, tickets, billing, analytics, and reputation.'
  },
  servers: [
    { url: BASE_URL }
  ],
  paths: {
    '/api/tools/check-order-status': {
      post: {
        operationId: 'checkOrderStatus',
        summary: 'Check the shipping status of a customer order',
        description: 'Queries the external store to find the current tracking and shipping status of an order.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  order_id: { type: 'string', description: 'The alphanumeric order ID, e.g., ORD-12345' }
                },
                required: ['order_id']
              }
            }
          }
        },
        responses: {
          '200': { description: 'Successful response' }
        }
      }
    },
    '/api/tools/create-support-ticket': {
      post: {
        operationId: 'createSupportTicket',
        summary: 'Create a new support ticket',
        description: 'Creates a formal support ticket in the database for the user.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  workspace_id: { type: 'string', description: 'The UUID of the workspace' },
                  subject: { type: 'string', description: 'A short subject line' },
                  description: { type: 'string', description: 'Detailed description of the issue' },
                  priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Urgency level' },
                  external_conversation_id: { type: 'string', description: 'Chatwoot conversation ID' }
                },
                required: ['workspace_id', 'subject', 'description']
              }
            }
          }
        },
        responses: {
          '200': { description: 'Successful response' }
        }
      }
    },
    '/api/tools/issue-refund': {
      post: {
        operationId: 'issueRefund',
        summary: 'Draft a refund for an order',
        description: 'Prepares a refund for a customer. This action requires human approval and will return a pending state.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  order_id: { type: 'string', description: 'The alphanumeric order ID to refund' },
                  amount: { type: 'number', description: 'The numeric amount to refund in dollars (e.g. 50.00)' }
                },
                required: ['order_id', 'amount']
              }
            }
          }
        },
        responses: {
          '200': { description: 'Successful response' }
        }
      }
    },
    '/api/tools/get-workspace-analytics': {
      post: {
        operationId: 'getWorkspaceAnalytics',
        summary: 'Fetch ingested post analytics for a workspace',
        description: 'Returns real metrics from post_analytics via get_workspace_analytics RPC — not demo data.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  workspace_id: { type: 'string', format: 'uuid' }
                },
                required: ['workspace_id']
              }
            }
          }
        },
        responses: {
          '200': { description: 'Analytics payload' }
        }
      }
    },
    '/api/tools/get-competitor-mentions': {
      post: {
        operationId: 'getCompetitorMentions',
        summary: 'Fetch competitor and listening mentions',
        description: 'Returns ingested mentions when reputation listening targets are configured.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  workspace_id: { type: 'string', format: 'uuid' },
                  limit: { type: 'integer', minimum: 1, maximum: 50 }
                },
                required: ['workspace_id']
              }
            }
          }
        },
        responses: {
          '200': { description: 'Mentions list' }
        }
      }
    }
  }
};
