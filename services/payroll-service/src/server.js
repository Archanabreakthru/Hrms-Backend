"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const payrollService_1 = require("./services/payrollService");
const payrollController_1 = require("./controllers/payrollController");
const payrollRepository_1 = require("./repositories/payrollRepository");
const env_1 = require("./config/env");
const repo = new payrollRepository_1.InMemoryPayrollRepository();
// Standalone mock clients for HTTP listener mode
const dummyAttendClient = {
    getPayrollSummary: async () => ({ presentDays: 22, halfDays: 0, absentDays: 0, totalOvertimeHours: 0, lossOfPayDays: 0 }),
};
const dummyClientClient = {
    getPayrollVerification: async () => ({ verifiedHours: 0, allowanceMonthly: 0, isEligible: true }),
};
const service = new payrollService_1.PayrollService(repo, dummyAttendClient, dummyClientClient);
const controller = new payrollController_1.PayrollController(service);
const app = (0, app_1.createApp)(controller);
app.listen(env_1.config.port, () => {
    console.log(`[payroll-service] Running on port ${env_1.config.port} in ${env_1.config.nodeEnv} mode`);
});
