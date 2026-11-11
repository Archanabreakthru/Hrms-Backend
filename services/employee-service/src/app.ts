import express, { Application } from 'express';
import { EmployeeController } from './controllers/employeeController';
import { createEmployeeRouter } from './routes/employeeRoutes';
import { correlationMiddleware } from '../../../shared/src/middleware/correlation';
import { errorHandler } from '../../../shared/src/middleware/errorHandler';

export function createApp(employeeController: EmployeeController): Application {
  const app = express();

  app.use(express.json());
  app.use(correlationMiddleware);

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'UP',
      service: 'employee-service',
      port: 5009,
      timestamp: new Date().toISOString(),
    });
  });

  // Employee routes
  app.use('/api/v1/employees', createEmployeeRouter(employeeController));

  // Global error handler
  app.use(errorHandler);

  return app;
}

