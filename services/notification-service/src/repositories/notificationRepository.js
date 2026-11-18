"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryNotificationRepository = void 0;
class InMemoryNotificationRepository {
    notifications = [];
    auditLogs = [];
    async createNotification(data) {
        const record = {
            ...data,
            id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            isRead: false,
            readAt: null,
            createdAt: new Date(),
        };
        this.notifications.push(record);
        return record;
    }
    async getNotificationsByRecipient(recipientId, unreadOnly = false) {
        return this.notifications
            .filter((n) => n.recipientId === recipientId && (!unreadOnly || !n.isRead))
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    async markAsRead(notificationId, recipientId) {
        const notif = this.notifications.find((n) => n.id === notificationId && n.recipientId === recipientId);
        if (!notif) {
            throw new Error('Notification not found or unauthorized');
        }
        notif.isRead = true;
        notif.readAt = new Date();
        return notif;
    }
    async markAllAsRead(recipientId) {
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
    async getUnreadCount(recipientId) {
        return this.notifications.filter((n) => n.recipientId === recipientId && !n.isRead).length;
    }
    async createAuditLog(data) {
        const record = {
            ...data,
            id: `AUDIT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            timestamp: new Date(),
        };
        this.auditLogs.push(record);
        return record;
    }
    async queryAuditLogs(filters) {
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
exports.InMemoryNotificationRepository = InMemoryNotificationRepository;
