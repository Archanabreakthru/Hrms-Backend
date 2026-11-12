"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditLogSchema = exports.createNotificationSchema = void 0;
const zod_1 = require("zod");
exports.createNotificationSchema = zod_1.z.object({
    recipientId: zod_1.z.string().min(1, 'Recipient ID is required'),
    tenantId: zod_1.z.string().optional(),
    title: zod_1.z.string().min(1, 'Title is required'),
    message: zod_1.z.string().min(1, 'Message is required'),
    type: zod_1.z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'APPROVAL_REQUEST', 'ACTION_REQUIRED']).default('INFO'),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
    channel: zod_1.z.enum(['IN_APP', 'EMAIL', 'SMS', 'PUSH']).default('IN_APP'),
    linkUrl: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
exports.createAuditLogSchema = zod_1.z.object({
    serviceName: zod_1.z.string().min(1, 'Service name is required'),
    action: zod_1.z.string().min(1, 'Action name is required'),
    resourceType: zod_1.z.string().min(1, 'Resource type is required'),
    resourceId: zod_1.z.string().optional(),
    actorId: zod_1.z.string().min(1, 'Actor ID is required'),
    actorRole: zod_1.z.string().optional(),
    actorIp: zod_1.z.string().optional(),
    details: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    diff: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    correlationId: zod_1.z.string().optional(),
});
