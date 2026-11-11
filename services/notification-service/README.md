# Notification & Audit Service — Orbyx HRMS

## Domain Scope
- **Notification Dispatch:** In-app alert feeds, push notifications, and transactional emails (approval alerts, leave status changes, payslip release notifications, asset assignment confirmations).
- **Notification Preferences:** User notification channel settings and read/unread status.
- **Centralized Audit Logging:** Immutable security logs, compliance tracking, attendance correction audit trails, and payroll finalization audit trails.

## Database Ownership
- **Database:** PostgreSQL (`orbyx_notification_db`)
- **ORM:** Prisma (`prisma/schema.prisma`)
- **Owned Entities:** Notifications, NotificationTemplates, UserNotificationPreferences, AuditLogs.

## Internal Port
- Default: `5008`

