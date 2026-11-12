"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const expenseService_1 = require("../src/services/expenseService");
const expenseRepository_1 = require("../src/repositories/expenseRepository");
const roles_1 = require("../../../shared/src/constants/roles");
const mockEmployee = {
    id: 'usr-1',
    email: 'john@orbyx.io',
    role: roles_1.UserRole.EMPLOYEE,
    employeeId: 'EMP-SWE-0001',
    permissions: ['expenses.claim_self'],
};
const mockManager = {
    id: 'usr-mgr-1',
    email: 'manager@orbyx.io',
    role: roles_1.UserRole.REPORTING_MANAGER,
    employeeId: 'EMP-MD-0001',
    permissions: ['expenses.approve_team'],
};
const mockHrAdmin = {
    id: 'usr-hr-1',
    email: 'hr@orbyx.io',
    role: roles_1.UserRole.HR_ADMIN,
    permissions: ['expenses.approve_all'],
};
(0, node_test_1.default)('ExpenseService validates policy limits and executes multi-tier approval workflow', async () => {
    const repo = new expenseRepository_1.InMemoryExpenseRepository();
    const service = new expenseService_1.ExpenseService(repo);
    // 1. Claim exceeding policy limit (₹10,000 max for CAT-TRAVEL) throws ValidationError
    await strict_1.default.rejects(async () => {
        await service.submitClaim({
            employeeId: 'EMP-SWE-0001',
            categoryId: 'CAT-TRAVEL',
            amount: 25000,
            expenseDate: '2026-11-05',
            purpose: 'International flight',
            receiptUrl: 'https://storage.orbyx.io/receipts/rec1.pdf',
        }, mockEmployee);
    }, {
        name: 'ValidationError',
    });
    // 2. Valid claim submission
    const claim = await service.submitClaim({
        employeeId: 'EMP-SWE-0001',
        categoryId: 'CAT-TRAVEL',
        amount: 4500,
        expenseDate: '2026-11-05',
        purpose: 'Client site Uber commute',
        receiptUrl: 'https://storage.orbyx.io/receipts/rec1.pdf',
    }, mockEmployee);
    strict_1.default.equal(claim.status, 'Submitted');
    strict_1.default.equal(claim.amount, 4500);
    // 3. Manager approves
    const mgrApproved = await service.managerReview(claim.id, 'Approved', 'Valid trip', mockManager);
    strict_1.default.equal(mgrApproved.status, 'Approved_By_Manager');
    // 4. HR Admin gives final reimbursement approval
    const hrApproved = await service.hrFinalApprove(claim.id, 'Approved', 'Processed for payroll payout', mockHrAdmin);
    strict_1.default.equal(hrApproved.status, 'Approved_By_HR');
});
