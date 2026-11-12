import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController';
import { validateRequest } from '../../../../shared/src/middleware/validation';
import { createNotificationSchema, createAuditLogSchema } from '../validators/notificationValidators';
import { createAuthMiddleware, requirePermission } from '../../../../shared/src/middleware/auth';
import { notificationConfig } from '../config/env';

export function createNotificationRouter(controller: NotificationController): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(notificationConfig.jwtSecret);

  // Internal/Service dispatch endpoint
  router.post(
    '/dispatch',
    validateRequest({ body: createNotificationSchema }),
    controller.sendNotification
  );

  // Authenticated user endpoints
  router.get('/my', authMiddleware, controller.getMyNotifications);
  router.get('/my/unread-count', authMiddleware, controller.getMyUnreadCount);
  router.patch('/:id/read', authMiddleware, controller.markAsRead);
  router.post('/read-all', authMiddleware, controller.markAllAsRead);

  return router;
}

export function createAuditRouter(controller: NotificationController): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(notificationConfig.jwtSecret);

  // Ingestion from other services
  router.post('/logs', validateRequest({ body: createAuditLogSchema }), controller.createAuditLog);

  // Query audit logs (Restricted to HR / Compliance / Super Admin roles)
  router.get('/logs', authMiddleware, requirePermission('audit.logs.read_all'), controller.queryAuditLogs);

  return router;
}
