"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const notificationRepository_1 = require("../src/repositories/notificationRepository");
const notificationService_1 = require("../src/services/notificationService");
(0, node_test_1.describe)('Notification & Audit Service', () => {
    (0, node_test_1.it)('dispatches notification, tracks unread count, and marks as read', async () => {
        const repo = new notificationRepository_1.InMemoryNotificationRepository();
        const service = new notificationService_1.NotificationService(repo);
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
        node_assert_1.default.strictEqual(unreadCount1, 2, 'Recipient should have 2 unread notifications');
        // Mark notif1 as read
        const updated = await service.markAsRead(notif1.id, 'EMP-001');
        node_assert_1.default.strictEqual(updated.isRead, true);
        const unreadCount2 = await service.getMyUnreadCount('EMP-001');
        node_assert_1.default.strictEqual(unreadCount2, 1, 'Recipient should have 1 unread notification left');
        // Fetch list
        const unreadOnly = await service.getMyNotifications('EMP-001', true);
        node_assert_1.default.strictEqual(unreadOnly.length, 1);
        node_assert_1.default.strictEqual(unreadOnly[0].id, notif2.id);
        // Mark all as read
        const markAllResult = await service.markAllAsRead('EMP-001');
        node_assert_1.default.strictEqual(markAllResult.markedCount, 1);
        const finalUnread = await service.getMyUnreadCount('EMP-001');
        node_assert_1.default.strictEqual(finalUnread, 0);
    });
    (0, node_test_1.it)('records immutable audit logs and queries them with filters', async () => {
        const repo = new notificationRepository_1.InMemoryNotificationRepository();
        const service = new notificationService_1.NotificationService(repo);
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
        node_assert_1.default.strictEqual(allLogs.length, 2);
        // Query filtered by serviceName
        const payrollLogs = await service.queryAuditLogs({ serviceName: 'payroll-service' });
        node_assert_1.default.strictEqual(payrollLogs.length, 1);
        node_assert_1.default.strictEqual(payrollLogs[0].action, 'PAYROLL_EXECUTION');
        node_assert_1.default.strictEqual(payrollLogs[0].actorRole, 'HR_ADMIN');
    });
});
