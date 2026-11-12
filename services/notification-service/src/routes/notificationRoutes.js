"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotificationRouter = createNotificationRouter;
exports.createAuditRouter = createAuditRouter;
const express_1 = require("express");
const validation_1 = require("../../../../shared/src/middleware/validation");
const notificationValidators_1 = require("../validators/notificationValidators");
const auth_1 = require("../../../../shared/src/middleware/auth");
const env_1 = require("../config/env");
function createNotificationRouter(controller) {
    const router = (0, express_1.Router)();
    const authMiddleware = (0, auth_1.createAuthMiddleware)(env_1.notificationConfig.jwtSecret);
    // Internal/Service dispatch endpoint
    router.post('/dispatch', (0, validation_1.validateRequest)({ body: notificationValidators_1.createNotificationSchema }), controller.sendNotification);
    // Authenticated user endpoints
    router.get('/my', authMiddleware, controller.getMyNotifications);
    router.get('/my/unread-count', authMiddleware, controller.getMyUnreadCount);
    router.patch('/:id/read', authMiddleware, controller.markAsRead);
    router.post('/read-all', authMiddleware, controller.markAllAsRead);
    return router;
}
function createAuditRouter(controller) {
    const router = (0, express_1.Router)();
    const authMiddleware = (0, auth_1.createAuthMiddleware)(env_1.notificationConfig.jwtSecret);
    // Ingestion from other services
    router.post('/logs', (0, validation_1.validateRequest)({ body: notificationValidators_1.createAuditLogSchema }), controller.createAuditLog);
    // Query audit logs (Restricted to HR / Compliance / Super Admin roles)
    router.get('/logs', authMiddleware, (0, auth_1.requirePermission)('audit.logs.read_all'), controller.queryAuditLogs);
    return router;
}
