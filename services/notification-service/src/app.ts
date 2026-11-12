import express from 'express';
import cors from 'cors';
import { correlationMiddleware } from '../../../shared/src/middleware/correlation';
import { errorHandler } from '../../../shared/src/middleware/errorHandler';
import { InMemoryNotificationRepository } from './repositories/notificationRepository';
import { NotificationService } from './services/notificationService';
import { NotificationController } from './controllers/notificationController';
import { createNotificationRouter, createAuditRouter } from './routes/notificationRoutes';

export function createApp(customRepo?: InMemoryNotificationRepository) {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(correlationMiddleware);

  const repo = customRepo || new InMemoryNotificationRepository();
  const service = new NotificationService(repo);
  const controller = new NotificationController(service);

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', service: 'notification-service' });
  });

  app.use('/api/v1/notifications', createNotificationRouter(controller));
  app.use('/api/v1/audit', createAuditRouter(controller));

  app.use(errorHandler);

  return { app, service, repo };
}
