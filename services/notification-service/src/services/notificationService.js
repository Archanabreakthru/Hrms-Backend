"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const emailService_1 = require("./emailService");
const env_1 = require("../config/env");
class NotificationService {
    repo;
    emailService;
    constructor(repo, emailService) {
        this.repo = repo;
        this.emailService = emailService || new emailService_1.EmailService();
    }
    async verifySmtp() {
        return this.emailService.verifyConnection();
    }
    async sendNotification(data) {
        // 1. If channel is EMAIL, dispatch physical email via EmailService
        if (data.channel === 'EMAIL' && data.metadata?.activationToken) {
            if (data.metadata.clientName || data.metadata.supervisorName) {
                // Client supervisor welcome email
                const supervisorData = {
                    recipientEmail: data.metadata.recipientEmail || data.recipientId,
                    supervisorName: data.metadata.supervisorName || data.metadata.fullName || 'Client Supervisor',
                    clientName: data.metadata.clientName || 'Partner Client Organization',
                    activationToken: data.metadata.activationToken,
                    portalUrl: data.metadata.portalUrl || env_1.notificationConfig.portalUrl,
                };
                try {
                    await this.emailService.sendClientSupervisorWelcomeEmail(supervisorData);
                    if (!data.metadata)
                        data.metadata = {};
                    data.metadata.deliveryStatus = 'DELIVERED';
                }
                catch (err) {
                    if (!data.metadata)
                        data.metadata = {};
                    data.metadata.deliveryError = err.message || 'SMTP delivery failed';
                    data.metadata.deliveryStatus = 'FAILED';
                }
            }
            else {
                // Employee onboarding activation email
                const emailData = {
                    recipientEmail: data.metadata.recipientEmail || data.recipientId,
                    employeeName: data.metadata.employeeName || 'Colleague',
                    employeeId: data.metadata.employeeId || data.recipientId,
                    activationToken: data.metadata.activationToken,
                    companyName: data.metadata.companyName,
                };
                try {
                    await this.emailService.sendActivationEmail(emailData);
                    if (!data.metadata)
                        data.metadata = {};
                    data.metadata.deliveryStatus = 'DELIVERED';
                }
                catch (err) {
                    if (!data.metadata)
                        data.metadata = {};
                    data.metadata.deliveryError = err.message || 'SMTP delivery failed';
                    data.metadata.deliveryStatus = 'FAILED';
                }
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
        return this.repo.markAsRead(notificationId, recipientId);
    }
    async markAllAsRead(recipientId) {
        const count = await this.repo.markAllAsRead(recipientId);
        return { count, markedCount: count };
    }
    async recordAudit(data) {
        return this.createAuditLog(data);
    }
    async createAuditLog(data) {
        return this.repo.createAuditLog(data);
    }
    async queryAuditLogs(filters) {
        return this.repo.queryAuditLogs(filters);
    }
}
exports.NotificationService = NotificationService;
