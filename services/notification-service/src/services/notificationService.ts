import { INotificationRepository, NotificationRecord, AuditLogRecord } from '../repositories/notificationRepository';
import { AppError } from '../../../../shared/src/errors/AppError';
import { EmailService, ActivationEmailData } from './emailService';

export class NotificationService {
  private emailService: EmailService;

  constructor(private repo: INotificationRepository, emailService?: EmailService) {
    this.emailService = emailService || new EmailService();
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
      const emailData: ActivationEmailData = {
        recipientEmail: data.metadata.recipientEmail || data.recipientId,
        employeeName: data.metadata.employeeName || 'Colleague',
        employeeId: data.metadata.employeeId || data.recipientId,
        activationToken: data.metadata.activationToken,
        companyName: data.metadata.companyName,
      };

      try {
        await this.emailService.sendActivationEmail(emailData);
      } catch (err: any) {
        // Record failure in notification record metadata for delivery tracking
        if (!data.metadata) data.metadata = {};
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

  async getMyNotifications(recipientId: string, unreadOnly = false): Promise<NotificationRecord[]> {
    return this.repo.getNotificationsByRecipient(recipientId, unreadOnly);
  }

  async getMyUnreadCount(recipientId: string): Promise<number> {
    return this.repo.getUnreadCount(recipientId);
  }

  async markAsRead(notificationId: string, recipientId: string): Promise<NotificationRecord> {
    try {
      return await this.repo.markAsRead(notificationId, recipientId);
    } catch {
      throw new AppError('Notification not found or access denied', 404);
    }
  }

  async markAllAsRead(recipientId: string): Promise<{ markedCount: number }> {
    const markedCount = await this.repo.markAllAsRead(recipientId);
    return { markedCount };
  }

  // Audit Logs (Write-Only append / Read-only query for authorized compliance)
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
    return this.repo.createAuditLog(data);
  }

  async queryAuditLogs(filters?: { serviceName?: string; actorId?: string; resourceType?: string; resourceId?: string; limit?: number }): Promise<AuditLogRecord[]> {
    return this.repo.queryAuditLogs(filters);
  }
}
