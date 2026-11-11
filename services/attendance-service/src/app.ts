import express, { Application } from 'express';
import { AttendanceController } from './controllers/attendanceController';
import { createAttendanceRouter } from './routes/attendanceRoutes';
import { correlationMiddleware } from '../../../shared/src/middleware/correlation';
import { errorHandler } from '../../../shared/src/middleware/errorHandler';

export function createApp(controller: AttendanceController): Application {
  const app = express();

  app.use(express.json());
  app.use(correlationMiddleware);

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'UP',
      service: 'attendance-service',
      port: 5003,
      timestamp: new Date().toISOString(),
    });
  });

  // Attendance & Leave routes
  app.use('/api/v1/attendance', createAttendanceRouter(controller));

  // Global error handler
  app.use(errorHandler);

  return app;
}

