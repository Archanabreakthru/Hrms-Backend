import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController';
import { validateRequest } from '../../../../shared/src/middleware/validation';
import { createNotificationSchema, createAuditLogSchema } from '../validators/notificationValidators';
import { authenticateJwt, requirePermissions } from '../../../../shared/src/middleware/auth';

export function createNotificationRouter(controller: NotificationController): Router {
  const router = Router();

  // Internal/Service dispatch endpoint
  router.post(
    '/dispatch',
    validateRequest(createNotificationSchema),
    controller.sendNotification
  );

  // Authenticated user endpoints
  router.get('/my', authenticateJwt, controller.getMyNotifications);
  router.get('/my/unread-count', authenticateJwt, controller.getMyUnreadCount);
  router.patch('/:id/read', authenticateJwt, controller.markAsRead);
  router.post('/read-all', authenticateJwt, controller.markAllAsRead);

  return router;
}

export function createAuditRouter(controller: NotificationController): Router {
  const router = Router();

  // Ingestion from other services
  router.post('/logs', validateRequest(createAuditLogSchema), controller.createAuditLog);

  // Query audit logs (Restricted to HR / Compliance roles)
  router.get('/logs', authenticateJwt, requirePermissions('audit:read'), controller.queryAuditLogs);

  return router;
}
