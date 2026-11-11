import test from 'node:test';
import assert from 'node:assert/strict';
import { ExpenseService } from '../src/services/expenseService';
import { InMemoryExpenseRepository } from '../src/repositories/expenseRepository';
import { UserRole } from '../../../shared/src/constants/roles';
import { AuthenticatedUser } from '../../../shared/src/contracts/auth';

const mockEmployee: AuthenticatedUser = {
  id: 'usr-1',
  email: 'john@orbyx.io',
  role: UserRole.EMPLOYEE,
  employeeId: 'EMP-SWE-0001',
  permissions: ['expenses.claim_self'],
};

const mockManager: AuthenticatedUser = {
  id: 'usr-mgr-1',
  email: 'manager@orbyx.io',
  role: UserRole.REPORTING_MANAGER,
  employeeId: 'EMP-MD-0001',
  permissions: ['expenses.approve_team'],
};

const mockHrAdmin: AuthenticatedUser = {
  id: 'usr-hr-1',
  email: 'hr@orbyx.io',
  role: UserRole.HR_ADMIN,
  permissions: ['expenses.approve_all'],
};

test('ExpenseService validates policy limits and executes multi-tier approval workflow', async () => {
  const repo = new InMemoryExpenseRepository();
  const service = new ExpenseService(repo);

  // 1. Claim exceeding policy limit (₹10,000 max for CAT-TRAVEL) throws ValidationError
  await assert.rejects(
    async () => {
      await service.submitClaim(
        {
          employeeId: 'EMP-SWE-0001',
          categoryId: 'CAT-TRAVEL',
          amount: 25000,
          expenseDate: '2026-11-05',
          purpose: 'International flight',
          receiptUrl: 'https://storage.orbyx.io/receipts/rec1.pdf',
        },
        mockEmployee
      );
    },
    {
      name: 'ValidationError',
    }
  );

  // 2. Valid claim submission
  const claim = await service.submitClaim(
    {
      employeeId: 'EMP-SWE-0001',
      categoryId: 'CAT-TRAVEL',
      amount: 4500,
      expenseDate: '2026-11-05',
      purpose: 'Client site Uber commute',
      receiptUrl: 'https://storage.orbyx.io/receipts/rec1.pdf',
    },
    mockEmployee
  );

  assert.equal(claim.status, 'Submitted');
  assert.equal(claim.amount, 4500);

  // 3. Manager approves
  const mgrApproved = await service.managerReview(claim.id, 'Approved', 'Valid trip', mockManager);
  assert.equal(mgrApproved.status, 'Approved_By_Manager');

  // 4. HR Admin gives final reimbursement approval
  const hrApproved = await service.hrFinalApprove(claim.id, 'Approved', 'Processed for payroll payout', mockHrAdmin);
  assert.equal(hrApproved.status, 'Approved_By_HR');
});

