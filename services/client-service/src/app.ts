import express, { Application } from 'express';
import { ClientController } from './controllers/clientController';
import { createClientRouter } from './routes/clientRoutes';
import { correlationMiddleware } from '../../../shared/src/middleware/correlation';
import { errorHandler } from '../../../shared/src/middleware/errorHandler';

export function createApp(controller: ClientController): Application {
  const app = express();

  app.use(express.json());
  app.use(correlationMiddleware);

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'UP',
      service: 'client-service',
      port: 5007,
      timestamp: new Date().toISOString(),
    });
  });

  // Client routes
  app.use('/api/v1/clients', createClientRouter(controller));

  // Global error handler
  app.use(errorHandler);

  return app;
}

