export interface NotificationRecord {
  id: string;
  recipientId: string;
  tenantId?: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'APPROVAL_REQUEST' | 'ACTION_REQUIRED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  channel: 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH';
  isRead: boolean;
  readAt?: Date | null;
  linkUrl?: string;
  metadata?: any;
  createdAt: Date;
}

export interface AuditLogRecord {
  id: string;
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
  timestamp: Date;
}

export interface INotificationRepository {
  createNotification(data: Omit<NotificationRecord, 'id' | 'isRead' | 'readAt' | 'createdAt'>): Promise<NotificationRecord>;
  getNotificationsByRecipient(recipientId: string, unreadOnly?: boolean): Promise<NotificationRecord[]>;
  markAsRead(notificationId: string, recipientId: string): Promise<NotificationRecord>;
  markAllAsRead(recipientId: string): Promise<number>;
  getUnreadCount(recipientId: string): Promise<number>;
  
  // Immutable Audit Log
  createAuditLog(data: Omit<AuditLogRecord, 'id' | 'timestamp'>): Promise<AuditLogRecord>;
  queryAuditLogs(filters?: { serviceName?: string; actorId?: string; resourceType?: string; resourceId?: string; limit?: number }): Promise<AuditLogRecord[]>;
}

export class InMemoryNotificationRepository implements INotificationRepository {
  private notifications: NotificationRecord[] = [];
  private auditLogs: AuditLogRecord[] = [];

  async createNotification(data: Omit<NotificationRecord, 'id' | 'isRead' | 'readAt' | 'createdAt'>): Promise<NotificationRecord> {
    const record: NotificationRecord = {
      ...data,
      id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      isRead: false,
      readAt: null,
      createdAt: new Date(),
    };
    this.notifications.push(record);
    return record;
  }

  async getNotificationsByRecipient(recipientId: string, unreadOnly = false): Promise<NotificationRecord[]> {
    return this.notifications
      .filter((n) => n.recipientId === recipientId && (!unreadOnly || !n.isRead))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async markAsRead(notificationId: string, recipientId: string): Promise<NotificationRecord> {
    const notif = this.notifications.find((n) => n.id === notificationId && n.recipientId === recipientId);
    if (!notif) {
      throw new Error('Notification not found or unauthorized');
    }
    notif.isRead = true;
    notif.readAt = new Date();
    return notif;
  }

  async markAllAsRead(recipientId: string): Promise<number> {
    let count = 0;
    for (const notif of this.notifications) {
      if (notif.recipientId === recipientId && !notif.isRead) {
        notif.isRead = true;
        notif.readAt = new Date();
        count++;
      }
    }
    return count;
  }

  async getUnreadCount(recipientId: string): Promise<number> {
    return this.notifications.filter((n) => n.recipientId === recipientId && !n.isRead).length;
  }

  async createAuditLog(data: Omit<AuditLogRecord, 'id' | 'timestamp'>): Promise<AuditLogRecord> {
    const record: AuditLogRecord = {
      ...data,
      id: `AUDIT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date(),
    };
    this.auditLogs.push(record);
    return record;
  }

  async queryAuditLogs(filters?: { serviceName?: string; actorId?: string; resourceType?: string; resourceId?: string; limit?: number }): Promise<AuditLogRecord[]> {
    let results = [...this.auditLogs];
    if (filters?.serviceName) {
      results = results.filter((l) => l.serviceName === filters.serviceName);
    }
    if (filters?.actorId) {
      results = results.filter((l) => l.actorId === filters.actorId);
    }
    if (filters?.resourceType) {
      results = results.filter((l) => l.resourceType === filters.resourceType);
    }
    if (filters?.resourceId) {
      results = results.filter((l) => l.resourceId === filters.resourceId);
    }
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    if (filters?.limit) {
      results = results.slice(0, filters.limit);
    }
    return results;
  }
}

