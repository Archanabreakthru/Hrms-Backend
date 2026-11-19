import { createApp } from './app';
import { EmployeeService } from './services/employeeService';
import { EmployeeController } from './controllers/employeeController';
import { PrismaEmployeeRepository } from './repositories/prismaEmployeeRepository';
import { OrgServiceClient } from './services/orgServiceClient';
import { OutboxDispatcher } from './services/outboxDispatcher';
import { config } from './config/env';
import { PrismaClient } from './generated/client';

const prisma = new PrismaClient();
const employeeRepo = new PrismaEmployeeRepository(prisma);
const orgClient = new OrgServiceClient(config.orgServiceUrl);
const employeeService = new EmployeeService(employeeRepo, orgClient);
const employeeController = new EmployeeController(employeeService);
const app = createApp(employeeController);

// Start Automated Outbox Dispatcher for Onboarding Account Provisioning & Welcome Email
const dispatcher = new OutboxDispatcher(prisma as any, {
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:5001',
  notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5008',
  internalServiceSecret: process.env.INTERNAL_SERVICE_SECRET || config.jwtSecret,
  pollIntervalMs: 3000,
  batchSize: 10,
});
dispatcher.start();
console.log('[employee-service] Automated Onboarding Outbox Dispatcher started');

app.listen(config.port, () => {
  console.log(`[employee-service] Running on port ${config.port} in ${config.nodeEnv} mode with Prisma PostgreSQL repository`);
});
