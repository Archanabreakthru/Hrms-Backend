"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const AppError_1 = require("../../../../shared/src/errors/AppError");
class NotificationService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async sendNotification(data) {
        return this.repo.createNotification({
            recipientId: data.recipientId,
            tenantId: data.tenantId,
            title: data.title,
            message: data.message,
            type: data.type || 'INFO',
            priority: data.priority || 'MEDIUM',
            channel: data.channel || 'IN_APP',
            linkUrl: data.linkUrl,
            metadata: data.metadata,
        });
    }
    async getMyNotifications(recipientId, unreadOnly = false) {
        return this.repo.getNotificationsByRecipient(recipientId, unreadOnly);
    }
    async getMyUnreadCount(recipientId) {
        return this.repo.getUnreadCount(recipientId);
    }
    async markAsRead(notificationId, recipientId) {
        try {
            return await this.repo.markAsRead(notificationId, recipientId);
        }
        catch {
            throw new AppError_1.AppError('Notification not found or access denied', 404);
        }
    }
    async markAllAsRead(recipientId) {
        const markedCount = await this.repo.markAllAsRead(recipientId);
        return { markedCount };
    }
    // Audit Logs (Write-Only append / Read-only query for authorized compliance)
    async recordAudit(data) {
        return this.repo.createAuditLog(data);
    }
    async queryAuditLogs(filters) {
        return this.repo.queryAuditLogs(filters);
    }
}
exports.NotificationService = NotificationService;
