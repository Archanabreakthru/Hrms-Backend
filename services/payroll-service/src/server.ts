import { createApp } from './app';
import { PayrollService } from './services/payrollService';
import { PayrollController } from './controllers/payrollController';
import { InMemoryPayrollRepository } from './repositories/payrollRepository';
import { config } from './config/env';

const repo = new InMemoryPayrollRepository();
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

