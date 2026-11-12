"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const apiResponse_1 = require("../../../../shared/src/utilities/apiResponse");
const AppError_1 = require("../../../../shared/src/errors/AppError");
class NotificationController {
    service;
    constructor(service) {
        this.service = service;
    }
    sendNotification = async (req, res, next) => {
        try {
            const result = await this.service.sendNotification(req.body);
            return (0, apiResponse_1.sendSuccess)(res, result, 'Notification sent successfully', 201);
        }
        catch (err) {
            next(err);
        }
    };
    getMyNotifications = async (req, res, next) => {
        try {
            const recipientId = req.user?.employeeId || req.user?.userId;
            if (!recipientId)
                throw new AppError_1.AppError('Unauthorized', 401);
            const unreadOnly = req.query.unread === 'true';
            const results = await this.service.getMyNotifications(recipientId, unreadOnly);
            return (0, apiResponse_1.sendSuccess)(res, results, 'Notifications retrieved');
        }
        catch (err) {
            next(err);
        }
    };
    getMyUnreadCount = async (req, res, next) => {
        try {
            const recipientId = req.user?.employeeId || req.user?.userId;
            if (!recipientId)
                throw new AppError_1.AppError('Unauthorized', 401);
            const count = await this.service.getMyUnreadCount(recipientId);
            return (0, apiResponse_1.sendSuccess)(res, { unreadCount: count }, 'Unread count retrieved');
        }
        catch (err) {
            next(err);
        }
    };
    markAsRead = async (req, res, next) => {
        try {
            const recipientId = req.user?.employeeId || req.user?.userId;
            if (!recipientId)
                throw new AppError_1.AppError('Unauthorized', 401);
            const result = await this.service.markAsRead(req.params.id, recipientId);
            return (0, apiResponse_1.sendSuccess)(res, result, 'Notification marked as read');
        }
        catch (err) {
            next(err);
        }
    };
    markAllAsRead = async (req, res, next) => {
        try {
            const recipientId = req.user?.employeeId || req.user?.userId;
            if (!recipientId)
                throw new AppError_1.AppError('Unauthorized', 401);
            const result = await this.service.markAllAsRead(recipientId);
            return (0, apiResponse_1.sendSuccess)(res, result, 'All notifications marked as read');
        }
        catch (err) {
            next(err);
        }
    };
    // Audit Logs
    createAuditLog = async (req, res, next) => {
        try {
            const correlationId = req.correlationId;
            const result = await this.service.recordAudit({
                ...req.body,
                correlationId: req.body.correlationId || correlationId,
            });
            return (0, apiResponse_1.sendSuccess)(res, result, 'Audit log recorded', 201);
        }
        catch (err) {
            next(err);
        }
    };
    queryAuditLogs = async (req, res, next) => {
        try {
            const filters = {
                serviceName: req.query.serviceName,
                actorId: req.query.actorId,
                resourceType: req.query.resourceType,
                resourceId: req.query.resourceId,
                limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
            };
            const results = await this.service.queryAuditLogs(filters);
            return (0, apiResponse_1.sendSuccess)(res, results, 'Audit logs retrieved');
        }
        catch (err) {
            next(err);
        }
    };
}
exports.NotificationController = NotificationController;
