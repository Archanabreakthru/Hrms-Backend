import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notificationService';
import { sendSuccess } from '../../../../shared/src/utils/apiResponse';
import { AppError } from '../../../../shared/src/errors/AppError';

export class NotificationController {
  constructor(private service: NotificationService) {}

  sendNotification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.sendNotification(req.body);
      return sendSuccess(res, result, 'Notification sent successfully', 201);
    } catch (err) {
      next(err);
    }
  };

  getMyNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const recipientId = (req as any).user?.employeeId || (req as any).user?.userId;
      if (!recipientId) throw new AppError('Unauthorized', 401);
      const unreadOnly = req.query.unread === 'true';
      const results = await this.service.getMyNotifications(recipientId, unreadOnly);
      return sendSuccess(res, results, 'Notifications retrieved');
    } catch (err) {
      next(err);
    }
  };

  getMyUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const recipientId = (req as any).user?.employeeId || (req as any).user?.userId;
      if (!recipientId) throw new AppError('Unauthorized', 401);
      const count = await this.service.getMyUnreadCount(recipientId);
      return sendSuccess(res, { unreadCount: count }, 'Unread count retrieved');
    } catch (err) {
      next(err);
    }
  };

  markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const recipientId = (req as any).user?.employeeId || (req as any).user?.userId;
      if (!recipientId) throw new AppError('Unauthorized', 401);
      const result = await this.service.markAsRead(req.params.id, recipientId);
      return sendSuccess(res, result, 'Notification marked as read');
    } catch (err) {
      next(err);
    }
  };

  markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const recipientId = (req as any).user?.employeeId || (req as any).user?.userId;
      if (!recipientId) throw new AppError('Unauthorized', 401);
      const result = await this.service.markAllAsRead(recipientId);
      return sendSuccess(res, result, 'All notifications marked as read');
    } catch (err) {
      next(err);
    }
  };

  // Audit Logs
  createAuditLog = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const correlationId = (req as any).correlationId;
      const result = await this.service.recordAudit({
        ...req.body,
        correlationId: req.body.correlationId || correlationId,
      });
      return sendSuccess(res, result, 'Audit log recorded', 201);
    } catch (err) {
      next(err);
    }
  };

  queryAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        serviceName: req.query.serviceName as string,
        actorId: req.query.actorId as string,
        resourceType: req.query.resourceType as string,
        resourceId: req.query.resourceId as string,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      };
      const results = await this.service.queryAuditLogs(filters);
      return sendSuccess(res, results, 'Audit logs retrieved');
    } catch (err) {
      next(err);
    }
  };
}
