import { createApp } from './app';
import { PayrollService } from './services/payrollService';
import { PayrollController } from './controllers/payrollController';
import { PrismaPayrollRepository } from './repositories/prismaPayrollRepository';
import { InMemoryPayrollRepository } from './repositories/payrollRepository';
import { PrismaClient } from './generated/client';
import { config } from './config/env';

let repo;
try {
  const prisma = new PrismaClient();
  repo = new PrismaPayrollRepository(prisma);
} catch {
  repo = new InMemoryPayrollRepository();
}
// Standalone mock clients for HTTP listener mode
const dummyAttendClient = {
  getPayrollSummary: async () => ({ presentDays: 22, halfDays: 0, absentDays: 0, totalOvertimeHours: 0, lossOfPayDays: 0 }),
};
const dummyClientClient = {
  getPayrollVerification: async () => ({ verifiedHours: 0, allowanceMonthly: 0, isEligible: true }),
};

const service = new PayrollService(repo, dummyAttendClient, dummyClientClient);
const controller = new PayrollController(service);
const app = createApp(controller);

app.listen(config.port, () => {
  console.log(`[payroll-service] Running on port ${config.port} in ${config.nodeEnv} mode`);
});

