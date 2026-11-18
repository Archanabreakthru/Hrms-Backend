import { createApp } from './app';
import { EmployeeService } from './services/employeeService';
import { EmployeeController } from './controllers/employeeController';
import { PrismaEmployeeRepository } from './repositories/prismaEmployeeRepository';
import { OrgServiceClient } from './services/orgServiceClient';
import { config } from './config/env';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const employeeRepo = new PrismaEmployeeRepository(prisma);
const orgClient = new OrgServiceClient(config.orgServiceUrl);
const employeeService = new EmployeeService(employeeRepo, orgClient);
const employeeController = new EmployeeController(employeeService);
const app = createApp(employeeController);

app.listen(config.port, () => {
  console.log(`[employee-service] Running on port ${config.port} in ${config.nodeEnv} mode with Prisma PostgreSQL repository`);
});

