import express, { Application } from 'express';
import { PayrollController } from './controllers/payrollController';
import { createPayrollRouter } from './routes/payrollRoutes';
import { correlationMiddleware } from '../../../shared/src/middleware/correlation';
import { errorHandler } from '../../../shared/src/middleware/errorHandler';

export function createApp(controller: PayrollController): Application {
  const app = express();

  app.use(express.json());
  app.use(correlationMiddleware);

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'UP',
      service: 'payroll-service',
      port: 5004,
      timestamp: new Date().toISOString(),
    });
  });

  // Payroll routes
  app.use('/api/v1/payroll', createPayrollRouter(controller));

  // Global error handler
  app.use(errorHandler);

  return app;
}

