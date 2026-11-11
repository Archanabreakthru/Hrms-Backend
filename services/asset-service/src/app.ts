import express, { Application } from 'express';
import { AssetController } from './controllers/assetController';
import { createAssetRouter } from './routes/assetRoutes';
import { correlationMiddleware } from '../../../shared/src/middleware/correlation';
import { errorHandler } from '../../../shared/src/middleware/errorHandler';

export function createApp(controller: AssetController): Application {
  const app = express();

  app.use(express.json());
  app.use(correlationMiddleware);

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'UP',
      service: 'asset-service',
      port: 5006,
      timestamp: new Date().toISOString(),
    });
  });

  // Asset routes
  app.use('/api/v1/assets', createAssetRouter(controller));

  // Global error handler
  app.use(errorHandler);

  return app;
}

