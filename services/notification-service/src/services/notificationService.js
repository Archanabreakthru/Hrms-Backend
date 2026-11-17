"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const AppError_1 = require("../../../../shared/src/errors/AppError");
const emailService_1 = require("./emailService");
class NotificationService {
    repo;
    emailService;
    constructor(repo, emailService) {
        this.repo = repo;
        this.emailService = emailService || new emailService_1.EmailService();
    }
    async sendNotification(data) {
        // 1. If channel is EMAIL, dispatch physical email via EmailService
        if (data.channel === 'EMAIL' && data.metadata?.activationToken) {
            const emailData = {
                recipientEmail: data.metadata.recipientEmail || data.recipientId,
                employeeName: data.metadata.employeeName || 'Colleague',
                employeeId: data.metadata.employeeId || data.recipientId,
                activationToken: data.metadata.activationToken,
                companyName: data.metadata.companyName,
            };
            try {
                await this.emailService.sendActivationEmail(emailData);
            }
            catch (err) {
                // Record failure in notification record metadata for delivery tracking
                if (!data.metadata)
                    data.metadata = {};
                data.metadata.deliveryError = err.message || 'SMTP delivery failed';
                data.metadata.deliveryStatus = 'FAILED';
            }
        }
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
