import { PrismaClient } from '@prisma/client';
import { INotificationRepository, NotificationRecord, AuditLogRecord } from './notificationRepository';
import { randomUUID } from 'crypto';

export class PrismaNotificationRepository implements INotificationRepository {
  private prisma: PrismaClient;

  constructor(customPrisma?: PrismaClient) {
    this.prisma =
      customPrisma ||
      new PrismaClient({
        datasources: {
          db: {
            url:
              process.env.DATABASE_URL ||
              process.env.NOTIFICATION_DATABASE_URL ||
              'postgresql://hrms:hrms_Cele@106.51.152.194:8012/Hrms?schema=notification',
          },
        },
      });
  }

  private mapNotification(r: any): NotificationRecord {
    return {
      id: r.id,
      recipientId: r.recipient_id || r.recipientId,
      title: r.title,
      message: r.message,
      type: r.notification_type || r.type || 'INFO',
      priority: r.priority || 'MEDIUM',
      channel: r.channel || 'IN_APP',
      isRead: Boolean(r.is_read),
      readAt: r.read_at ? new Date(r.read_at) : null,
      linkUrl: r.link_url || undefined,
      metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata || {},
      createdAt: new Date(r.created_at),
    };
  }

  async createNotification(
    data: Omit<NotificationRecord, 'id' | 'isRead' | 'readAt' | 'createdAt'>
  ): Promise<NotificationRecord> {
    const q = this.prisma.$queryRawUnsafe.bind(this.prisma);
    const id = randomUUID();
    const metadataJson = JSON.stringify(data.metadata || {});

    await q(
      `INSERT INTO notification.notifications (
        id, recipient_id, title, message, notification_type, priority,
        channel, is_read, link_url, metadata, created_at
      ) VALUES (
        $1::uuid, $2, $3, $4, $5, $6,
        $7, false, $8, $9::jsonb, CURRENT_TIMESTAMP
      )`,
      id,
      data.recipientId,
      data.title,
      data.message,
      data.type || 'INFO',
      data.priority || 'MEDIUM',
      data.channel || 'IN_APP',
      data.linkUrl || null,
      metadataJson
    );

    return {
      ...data,
      id,
      isRead: false,
      readAt: null,
      createdAt: new Date(),
    };
  }

  async getNotificationsByRecipient(recipientId: string, unreadOnly = false): Promise<NotificationRecord[]> {
    const q = this.prisma.$queryRawUnsafe.bind(this.prisma);
    let query = `SELECT * FROM notification.notifications WHERE recipient_id = $1`;
    if (unreadOnly) {
      query += ` AND is_read = false`;
    }
    query += ` ORDER BY created_at DESC LIMIT 100`;

    const rows = (await q(query, recipientId)) as any[];
    return rows.map((r) => this.mapNotification(r));
  }

  async markAsRead(notificationId: string, recipientId: string): Promise<NotificationRecord> {
    const q = this.prisma.$queryRawUnsafe.bind(this.prisma);
    await q(
      `UPDATE notification.notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE id = $1::uuid AND recipient_id = $2`,
      notificationId,
      recipientId
    );
    const rows = (await q(`SELECT * FROM notification.notifications WHERE id = $1::uuid LIMIT 1`, notificationId)) as any[];
    if (rows && rows.length > 0) return this.mapNotification(rows[0]);
    throw new Error('Notification not found');
  }

  async markAllAsRead(recipientId: string): Promise<number> {
    const q = this.prisma.$queryRawUnsafe.bind(this.prisma);
    const result = (await q(
      `WITH updated AS (
        UPDATE notification.notifications SET is_read = true, read_at = CURRENT_TIMESTAMP
        WHERE recipient_id = $1 AND is_read = false
        RETURNING id
      ) SELECT count(*)::int as count FROM updated;`,
      recipientId
    )) as any[];
    return result[0]?.count || 0;
  }

  async getUnreadCount(recipientId: string): Promise<number> {
    const q = this.prisma.$queryRawUnsafe.bind(this.prisma);
    const rows = (await q(
      `SELECT count(*)::int as count FROM notification.notifications WHERE recipient_id = $1 AND is_read = false`,
      recipientId
    )) as any[];
    return rows[0]?.count || 0;
  }

  async createAuditLog(data: Omit<AuditLogRecord, 'id' | 'timestamp'>): Promise<AuditLogRecord> {
    const q = this.prisma.$queryRawUnsafe.bind(this.prisma);
    const id = randomUUID();
    const detailsJson = JSON.stringify(data.details || {});
    const diffJson = JSON.stringify(data.diff || {});

    await q(
      `INSERT INTO notification.audit_logs (
        id, service_name, action, resource_type, resource_id,
        actor_id, actor_role, details, diff, correlation_id, created_at
      ) VALUES (
        $1::uuid, $2, $3, $4, $5,
        $6, $7, $8::jsonb, $9::jsonb, $10, CURRENT_TIMESTAMP
      )`,
      id,
      data.serviceName,
      data.action,
      data.resourceType,
      data.resourceId || null,
      data.actorId,
      data.actorRole || null,
      detailsJson,
      diffJson,
      data.correlationId || null
    );

    return {
      ...data,
      id,
      timestamp: new Date(),
    };
  }

  async queryAuditLogs(filters?: {
    serviceName?: string;
    actorId?: string;
    resourceType?: string;
    resourceId?: string;
    limit?: number;
  }): Promise<AuditLogRecord[]> {
    const q = this.prisma.$queryRawUnsafe.bind(this.prisma);
    let query = `SELECT * FROM notification.audit_logs WHERE 1=1`;
    const params: any[] = [];

    if (filters?.serviceName) {
      params.push(filters.serviceName);
      query += ` AND service_name = $${params.length}`;
    }
    if (filters?.actorId) {
      params.push(filters.actorId);
      query += ` AND actor_id = $${params.length}`;
    }
    if (filters?.resourceType) {
      params.push(filters.resourceType);
      query += ` AND resource_type = $${params.length}`;
    }
    if (filters?.resourceId) {
      params.push(filters.resourceId);
      query += ` AND resource_id = $${params.length}`;
    }

    const limit = filters?.limit || 100;
    params.push(limit);
    query += ` ORDER BY created_at DESC LIMIT $${params.length}`;

    const rows = (await q(query, ...params)) as any[];
    return rows.map((r) => ({
      id: r.id,
      serviceName: r.service_name,
      action: r.action,
      resourceType: r.resource_type,
      resourceId: r.resource_id || undefined,
      actorId: r.actor_id,
      actorRole: r.actor_role || undefined,
      actorIp: r.actor_ip || undefined,
      details: typeof r.details === 'string' ? JSON.parse(r.details) : r.details || {},
      diff: typeof r.diff === 'string' ? JSON.parse(r.diff) : r.diff || {},
      correlationId: r.correlation_id || undefined,
      timestamp: new Date(r.created_at),
    }));
  }
}
