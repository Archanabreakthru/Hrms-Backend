import test from 'node:test';
import assert from 'node:assert/strict';
import { PayrollService, IAttendanceClient, IClientServiceClient } from '../src/services/payrollService';
import { InMemoryPayrollRepository } from '../src/repositories/payrollRepository';
import { UserRole } from '../../../shared/src/constants/roles';
import { AuthenticatedUser } from '../../../shared/src/contracts/auth';

const mockHrUser: AuthenticatedUser = {
  id: 'usr-hr-1',
  email: 'hr@orbyx.io',
  role: UserRole.HR_ADMIN,
  permissions: ['payroll.process', 'payroll.run.execute'],
};

const mockEmployeeUser: AuthenticatedUser = {
  id: 'usr-emp-1',
  email: 'john@orbyx.io',
  role: UserRole.EMPLOYEE,
  employeeId: 'EMP-SWE-0001',
  permissions: ['payslips.read_self'],
};

class MockAttendanceClient implements IAttendanceClient {
  async getPayrollSummary(employeeId: string, startDate: string, endDate: string) {
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

class MockClientServiceClient implements IClientServiceClient {
  async getPayrollVerification(employeeId: string, periodKey: string) {
    // 160 verified hours, ₹5,000 client onsite allowance
    return {
      verifiedHours: 160,
      allowanceMonthly: 5000,
      isEligible: true,
    };
  }
}

test('PayrollService calculates Indian statutory EPF, PT, TDS, and Attendance LOP with client allowance', async () => {
  const repo = new InMemoryPayrollRepository();
  const attendClient = new MockAttendanceClient();
  const clientClient = new MockClientServiceClient();
  const service = new PayrollService(repo, attendClient, clientClient);

  // November 2026 (30 days)
  const run = await service.runPayroll(11, 2026, ['EMP-SWE-0001'], mockHrUser);

  assert.equal(run.periodKey, '2026-11');
  assert.equal(run.status, 'Finalized');
  assert.equal(run.totalEmployees, 1);

  const payslip = run.lineItems[0];
  assert.equal(payslip.employeeId, 'EMP-SWE-0001');
  assert.equal(payslip.basic, 50000);
  assert.equal(payslip.hra, 25000);
  assert.equal(payslip.specialAllowance, 25000);
  assert.equal(payslip.clientAllowance, 5000);
  assert.equal(payslip.grossEarnings, 105000);

  // LOP Deduction = (105,000 / 30 days) * 2 LOP days = 7,000
  assert.equal(payslip.lopDeduction, 7000);

  // EPF = 12% of capped wage ceiling ₹15,000 = 1,800
  assert.equal(payslip.epfEmployeeDeduction, 1800);
  assert.equal(payslip.epfEmployerContribution, 1800);

  // ESI = 0 (gross exceeds ₹21,000)
  assert.equal(payslip.esiEmployeeDeduction, 0);

  // Professional Tax = 200
  assert.equal(payslip.professionalTaxDeduction, 200);

  // Net payable calculation verified
  assert.ok(payslip.netPayable > 0);
  assert.equal(
    payslip.netPayable,
    payslip.grossEarnings - payslip.totalDeductions
  );
});

test('PayrollService rejects unauthorized non-HR execution and prevents duplicate runs', async () => {
  const repo = new InMemoryPayrollRepository();
  const attendClient = new MockAttendanceClient();
  const clientClient = new MockClientServiceClient();
  const service = new PayrollService(repo, attendClient, clientClient);

  // Employee cannot trigger payroll
  await assert.rejects(
    async () => {
      await service.runPayroll(11, 2026, ['EMP-SWE-0001'], mockEmployeeUser);
    },
    {
      name: 'ForbiddenError',
    }
  );

  // First run succeeds
  await service.runPayroll(11, 2026, ['EMP-SWE-0001'], mockHrUser);

  // Re-running same finalized period throws ConflictError (idempotent protection)
  await assert.rejects(
    async () => {
      await service.runPayroll(11, 2026, ['EMP-SWE-0001'], mockHrUser);
    },
    {
      name: 'ConflictError',
      message: 'Payroll run for 2026-11 has already been finalized and cannot be re-executed',
    }
  );
});

