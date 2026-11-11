import { z } from 'zod';

export const createNotificationSchema = z.object({
  recipientId: z.string().min(1, 'Recipient ID is required'),
  tenantId: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  type: z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'APPROVAL_REQUEST', 'ACTION_REQUIRED']).default('INFO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  channel: z.enum(['IN_APP', 'EMAIL', 'SMS', 'PUSH']).default('IN_APP'),
  linkUrl: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const createAuditLogSchema = z.object({
  serviceName: z.string().min(1, 'Service name is required'),
  action: z.string().min(1, 'Action name is required'),
  resourceType: z.string().min(1, 'Resource type is required'),
  resourceId: z.string().optional(),
  actorId: z.string().min(1, 'Actor ID is required'),
  actorRole: z.string().optional(),
  actorIp: z.string().optional(),
  details: z.record(z.any()).optional(),
  diff: z.record(z.any()).optional(),
  correlationId: z.string().optional(),
});

