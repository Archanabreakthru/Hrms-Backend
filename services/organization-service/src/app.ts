import express, { Application } from 'express';
import { OrganizationController } from './controllers/orgController';
import { createOrgRouter } from './routes/orgRoutes';
import { correlationMiddleware } from '../../../shared/src/middleware/correlation';
import { errorHandler } from '../../../shared/src/middleware/errorHandler';

export function createApp(orgController: OrganizationController): Application {
  const app = express();

  app.use(express.json());
  app.use(correlationMiddleware);

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'UP',
      service: 'organization-service',
      port: 5002,
      timestamp: new Date().toISOString(),
    });
  });

  // Org routes
  app.use('/api/v1/org', createOrgRouter(orgController));

  // Global error handler
  app.use(errorHandler);

  return app;
}

