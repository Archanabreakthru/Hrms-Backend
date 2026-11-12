"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const payrollService_1 = require("../src/services/payrollService");
const payrollRepository_1 = require("../src/repositories/payrollRepository");
const roles_1 = require("../../../shared/src/constants/roles");
const mockHrUser = {
    id: 'usr-hr-1',
    email: 'hr@orbyx.io',
    role: roles_1.UserRole.HR_ADMIN,
    permissions: ['payroll.process', 'payroll.run.execute'],
};
const mockEmployeeUser = {
    id: 'usr-emp-1',
    email: 'john@orbyx.io',
    role: roles_1.UserRole.EMPLOYEE,
    employeeId: 'EMP-SWE-0001',
    permissions: ['payslips.read_self'],
};
class MockAttendanceClient {
    async getPayrollSummary(employeeId, startDate, endDate) {
        // 2 days Loss of Pay
        return {
            presentDays: 20,
            halfDays: 0,
            absentDays: 2,
            totalOvertimeHours: 4,
            lossOfPayDays: 2,
        };
    }
}
class MockClientServiceClient {
    async getPayrollVerification(employeeId, periodKey) {
        // 160 verified hours, ₹5,000 client onsite allowance
        return {
            verifiedHours: 160,
            allowanceMonthly: 5000,
            isEligible: true,
        };
    }
}
(0, node_test_1.default)('PayrollService calculates Indian statutory EPF, PT, TDS, and Attendance LOP with client allowance', async () => {
    const repo = new payrollRepository_1.InMemoryPayrollRepository();
    const attendClient = new MockAttendanceClient();
    const clientClient = new MockClientServiceClient();
    const service = new payrollService_1.PayrollService(repo, attendClient, clientClient);
    // November 2026 (30 days)
    const run = await service.runPayroll(11, 2026, ['EMP-SWE-0001'], mockHrUser);
    strict_1.default.equal(run.periodKey, '2026-11');
    strict_1.default.equal(run.status, 'Finalized');
    strict_1.default.equal(run.totalEmployees, 1);
    const payslip = run.lineItems[0];
    strict_1.default.equal(payslip.employeeId, 'EMP-SWE-0001');
    strict_1.default.equal(payslip.basic, 50000);
    strict_1.default.equal(payslip.hra, 25000);
    strict_1.default.equal(payslip.specialAllowance, 25000);
    strict_1.default.equal(payslip.clientAllowance, 5000);
    strict_1.default.equal(payslip.grossEarnings, 105000);
    // LOP Deduction = (105,000 / 30 days) * 2 LOP days = 7,000
    strict_1.default.equal(payslip.lopDeduction, 7000);
    // EPF = 12% of capped wage ceiling ₹15,000 = 1,800
    strict_1.default.equal(payslip.epfEmployeeDeduction, 1800);
    strict_1.default.equal(payslip.epfEmployerContribution, 1800);
    // ESI = 0 (gross exceeds ₹21,000)
    strict_1.default.equal(payslip.esiEmployeeDeduction, 0);
    // Professional Tax = 200
    strict_1.default.equal(payslip.professionalTaxDeduction, 200);
    // Net payable calculation verified
    strict_1.default.ok(payslip.netPayable > 0);
    strict_1.default.equal(payslip.netPayable, payslip.grossEarnings - payslip.totalDeductions);
});
(0, node_test_1.default)('PayrollService rejects unauthorized non-HR execution and prevents duplicate runs', async () => {
    const repo = new payrollRepository_1.InMemoryPayrollRepository();
    const attendClient = new MockAttendanceClient();
    const clientClient = new MockClientServiceClient();
    const service = new payrollService_1.PayrollService(repo, attendClient, clientClient);
    // Employee cannot trigger payroll
    await strict_1.default.rejects(async () => {
        await service.runPayroll(11, 2026, ['EMP-SWE-0001'], mockEmployeeUser);
    }, {
        name: 'ForbiddenError',
    });
    // First run succeeds
    await service.runPayroll(11, 2026, ['EMP-SWE-0001'], mockHrUser);
    // Re-running same finalized period throws ConflictError (idempotent protection)
    await strict_1.default.rejects(async () => {
        await service.runPayroll(11, 2026, ['EMP-SWE-0001'], mockHrUser);
    }, {
        name: 'ConflictError',
        message: 'Payroll run for 2026-11 has already been finalized and cannot be re-executed',
    });
});
