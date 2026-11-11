import express, { Application } from 'express';
import { AuthController } from './controllers/authController';
import { createAuthRouter } from './routes/authRoutes';
import { correlationMiddleware } from '../../../shared/src/middleware/correlation';
import { errorHandler } from '../../../shared/src/middleware/errorHandler';

export function createApp(authController: AuthController): Application {
  const app = express();

  app.use(express.json());
  app.use(correlationMiddleware);

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'UP',
      service: 'auth-service',
      port: 5001,
      timestamp: new Date().toISOString(),
    });
  });

  // Auth routes
  app.use('/api/v1/auth', createAuthRouter(authController));

  // Global error handler
  app.use(errorHandler);

  return app;
}

