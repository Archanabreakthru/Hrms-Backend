import { describe, it } from 'node:test';
import assert from 'node:assert';
import { InMemoryNotificationRepository } from '../src/repositories/notificationRepository';
import { NotificationService } from '../src/services/notificationService';

describe('Notification & Audit Service', () => {
  it('dispatches notification, tracks unread count, and marks as read', async () => {
    const repo = new InMemoryNotificationRepository();
    const service = new NotificationService(repo);

    // Send notification
    const notif1 = await service.sendNotification({
      recipientId: 'EMP-001',
      title: 'Leave Approved',
      message: 'Your leave application for Dec 25 has been approved.',
      type: 'SUCCESS',
      priority: 'HIGH',
    });

    const notif2 = await service.sendNotification({
      recipientId: 'EMP-001',
      title: 'Expense Submitted',
      message: 'Your travel claim is under review.',
      type: 'INFO',
    });

    const unreadCount1 = await service.getMyUnreadCount('EMP-001');
    assert.strictEqual(unreadCount1, 2, 'Recipient should have 2 unread notifications');

    // Mark notif1 as read
    const updated = await service.markAsRead(notif1.id, 'EMP-001');
    assert.strictEqual(updated.isRead, true);

    const unreadCount2 = await service.getMyUnreadCount('EMP-001');
    assert.strictEqual(unreadCount2, 1, 'Recipient should have 1 unread notification left');

    // Fetch list
    const unreadOnly = await service.getMyNotifications('EMP-001', true);
    assert.strictEqual(unreadOnly.length, 1);
    assert.strictEqual(unreadOnly[0].id, notif2.id);

    // Mark all as read
    const markAllResult = await service.markAllAsRead('EMP-001');
    assert.strictEqual(markAllResult.markedCount, 1);

    const finalUnread = await service.getMyUnreadCount('EMP-001');
    assert.strictEqual(finalUnread, 0);
  });

  it('records immutable audit logs and queries them with filters', async () => {
    const repo = new InMemoryNotificationRepository();
    const service = new NotificationService(repo);

    // Record audit entries
    await service.recordAudit({
      serviceName: 'payroll-service',
      action: 'PAYROLL_EXECUTION',
      resourceType: 'PayrollRun',
      resourceId: 'PAY-2026-11',
      actorId: 'EMP-HR-001',
      actorRole: 'HR_ADMIN',
      details: { month: '2026-11', totalDisbursed: 500000 },
    });

    await service.recordAudit({
      serviceName: 'attendance-service',
      action: 'ATTENDANCE_REGULARIZE',
      resourceType: 'AttendanceRecord',
      resourceId: 'ATT-999',
      actorId: 'EMP-MGR-002',
      actorRole: 'MANAGER',
      details: { reason: 'Onsite meeting' },
    });

    // Query all
    const allLogs = await service.queryAuditLogs();
    assert.strictEqual(allLogs.length, 2);

    // Query filtered by serviceName
    const payrollLogs = await service.queryAuditLogs({ serviceName: 'payroll-service' });
    assert.strictEqual(payrollLogs.length, 1);
    assert.strictEqual(payrollLogs[0].action, 'PAYROLL_EXECUTION');
    assert.strictEqual(payrollLogs[0].actorRole, 'HR_ADMIN');
  });
});
