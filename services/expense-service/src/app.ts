import express, { Application } from 'express';
import { ExpenseController } from './controllers/expenseController';
import { createExpenseRouter } from './routes/expenseRoutes';
import { correlationMiddleware } from '../../../shared/src/middleware/correlation';
import { errorHandler } from '../../../shared/src/middleware/errorHandler';

export function createApp(controller: ExpenseController): Application {
  const app = express();

  app.use(express.json());
  app.use(correlationMiddleware);

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'UP',
      service: 'expense-service',
      port: 5005,
      timestamp: new Date().toISOString(),
    });
  });

  // Expense routes
  app.use('/api/v1/expenses', createExpenseRouter(controller));

  // Global error handler
  app.use(errorHandler);

  return app;
}

