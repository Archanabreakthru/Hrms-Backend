import { INotificationRepository, NotificationRecord, AuditLogRecord } from '../repositories/notificationRepository';
import { AppError } from '../../../../shared/src/errors/AppError';
import { EmailService, ActivationEmailData, ClientSupervisorEmailData } from './emailService';
import { notificationConfig } from '../config/env';

export class NotificationService {
  private emailService: EmailService;

  constructor(private repo: INotificationRepository, emailService?: EmailService) {
    this.emailService = emailService || new EmailService();
  }

  async verifySmtp(): Promise<{ connected: boolean; provider: string; error?: string }> {
    return this.emailService.verifyConnection();
  }

  async sendNotification(data: {
    recipientId: string;
    tenantId?: string;
    title: string;
    message: string;
    type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'APPROVAL_REQUEST' | 'ACTION_REQUIRED';
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    channel?: 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH';
    linkUrl?: string;
    metadata?: any;
  }): Promise<NotificationRecord> {
    // 1. If channel is EMAIL, dispatch physical email via EmailService
    if (data.channel === 'EMAIL' && data.metadata?.activationToken) {
      if (data.metadata.clientName || data.metadata.supervisorName) {
        // Client supervisor welcome email
        const supervisorData: ClientSupervisorEmailData = {
          recipientEmail: data.metadata.recipientEmail || data.recipientId,
          supervisorName: data.metadata.supervisorName || data.metadata.fullName || 'Client Supervisor',
          clientName: data.metadata.clientName || 'Partner Client Organization',
          activationToken: data.metadata.activationToken,
          portalUrl: data.metadata.portalUrl || notificationConfig.portalUrl,
        };

        try {
          await this.emailService.sendClientSupervisorWelcomeEmail(supervisorData);
          if (!data.metadata) data.metadata = {};
          data.metadata.deliveryStatus = 'DELIVERED';
        } catch (err: any) {
          if (!data.metadata) data.metadata = {};
          data.metadata.deliveryError = err.message || 'SMTP delivery failed';
          data.metadata.deliveryStatus = 'FAILED';
        }
      } else {
        // Employee onboarding activation email
        const emailData: ActivationEmailData = {
          recipientEmail: data.metadata.recipientEmail || data.recipientId,
          employeeName: data.metadata.employeeName || 'Colleague',
          employeeId: data.metadata.employeeId || data.recipientId,
          activationToken: data.metadata.activationToken,
          companyName: data.metadata.companyName,
        };

        try {
          await this.emailService.sendActivationEmail(emailData);
          if (!data.metadata) data.metadata = {};
          data.metadata.deliveryStatus = 'DELIVERED';
        } catch (err: any) {
          if (!data.metadata) data.metadata = {};
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

  async getMyNotifications(recipientId: string, unreadOnly = false): Promise<NotificationRecord[]> {
    return this.repo.getNotificationsByRecipient(recipientId, unreadOnly);
  }

  async getMyUnreadCount(recipientId: string): Promise<number> {
    return this.repo.getUnreadCount(recipientId);
  }

  async markAsRead(notificationId: string, recipientId: string): Promise<NotificationRecord> {
    return this.repo.markAsRead(notificationId, recipientId);
  }

  async markAllAsRead(recipientId: string): Promise<{ count: number; markedCount: number }> {
    const count = await this.repo.markAllAsRead(recipientId);
    return { count, markedCount: count };
  }

  async recordAudit(data: {
    serviceName: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    actorId: string;
    actorRole?: string;
    actorIp?: string;
    details?: any;
    diff?: any;
    correlationId?: string;
  }): Promise<AuditLogRecord> {
    return this.createAuditLog(data);
  }

  async createAuditLog(data: {
    serviceName: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    actorId: string;
    actorRole?: string;
    actorIp?: string;
    details?: any;
    diff?: any;
    correlationId?: string;
  }): Promise<AuditLogRecord> {
    return this.repo.createAuditLog(data);
  }

  async queryAuditLogs(filters?: {
    serviceName?: string;
    actorId?: string;
    resourceType?: string;
    resourceId?: string;
    limit?: number;
  }): Promise<AuditLogRecord[]> {
    return this.repo.queryAuditLogs(filters);
  }
}
